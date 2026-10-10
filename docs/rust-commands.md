# Rust commands

The starter doesn't define any `#[tauri::command]`s yet. When you add them, keep
in mind where each kind of command runs:

| Command                         | Runs on                                        |
| ------------------------------- | ---------------------------------------------- |
| `fn` (not `async`)              | The main thread, inline. It blocks the UI while it runs |
| `async fn` / `#[tauri::command(async)]` | A worker thread of Tauri's async (Tokio) runtime |

Two mistakes follow from that.

## Spawn with `tauri::async_runtime::spawn`, not `tokio::spawn`

The main thread isn't inside a Tokio runtime. Calling `tokio::spawn` from a
non-`async` command panics with "there is no reactor running", which takes down
the whole app.

```rust
#[tauri::command]
fn start_sync(app: tauri::AppHandle) {
    // ✗ tokio::spawn(async move { ... });  — panics: no reactor running
    tauri::async_runtime::spawn(async move {
        // long-running work, e.g. emit progress events with `app.emit(...)`
        let _ = app;
    });
}
```

`tauri::async_runtime::spawn` uses Tauri's own runtime handle, so it works from
any thread.

## Keep blocking work off the main thread and the async workers

Blocking work (`std::fs` on large files, a synchronous HTTP client, heavy CPU)
freezes the UI in a plain `fn` command. In an `async fn` it ties up a runtime
worker and can stall other async commands and events. Make the command `async`
and move the blocking part onto the blocking thread pool:

```rust
#[tauri::command]
async fn read_notes(path: std::path::PathBuf) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || std::fs::read_to_string(path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}
```

A plain `fn` is fine for work that is genuinely quick (reading a small config
value, simple computation).

Register commands in `invoke_handler(tauri::generate_handler![...])` in
[`lib.rs`](../src-tauri/src/lib.rs). See also Tauri's
[command guide](https://v2.tauri.app/develop/calling-rust/#async-commands).
