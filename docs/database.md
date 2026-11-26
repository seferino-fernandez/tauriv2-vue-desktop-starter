# Database

The app keeps its data in one SQLite file, through [SQLx](https://github.com/launchbadge/sqlx).
Today that is the user's settings. The Rust side lives in
[`src-tauri/src/db.rs`](../src-tauri/src/db.rs) (opening the file, migrations) and
[`src-tauri/src/settings.rs`](../src-tauri/src/settings.rs) (the settings queries).

## Where the file lives

`app.db` in the app data directory, or `app-dev.db` in debug builds, so `just dev` never
migrates or overwrites the database of an installed release build:

| OS      | Directory                                                         |
| ------- | ----------------------------------------------------------------- |
| macOS   | `~/Library/Application Support/com.github.tauriv2-vue-desktop-starter` |
| Linux   | `~/.local/share/com.github.tauriv2-vue-desktop-starter`          |
| Windows | `%APPDATA%\com.github.tauriv2-vue-desktop-starter`               |

It is opened in WAL mode before the window shows, and pending migrations run then. If it cannot
be opened or migrated, the error is logged, the user gets a message saying so, with the log
folder's path, and the app quits when they close it. That includes a database
last opened by a newer version of the app: this build does not know its newest migration.

WAL mode puts two more files next to it, `app.db-wal` and `app.db-shm`. Recent writes sit in
`-wal` until SQLite copies them into the main file, and Tauri exits without closing the
database, so both files usually remain after the app quits. That is normal: the next open picks
up where it left off. Don't delete them on their own, since `-wal` may hold the latest changes,
and to copy or back up the database, copy all three files while the app is closed.

## Tooling

The queries use SQLx's `query!` macros, which check the SQL against the real schema at compile
time. They read the schema from the committed query cache in `src-tauri/.sqlx/`, so building
needs no database and no `DATABASE_URL`. Changing the schema or a query needs
[`sqlx-cli`](https://crates.io/crates/sqlx-cli):

```sh
cargo install sqlx-cli --no-default-features --features sqlite
```

| Recipe               | What it does                                                                 |
| -------------------- | ---------------------------------------------------------------------------- |
| `just db-new <name>` | Adds `src-tauri/migrations/<timestamp>_<name>.sql`                           |
| `just db-prepare`    | Builds a scratch database in `target/sqlx/` from the migrations and rewrites `.sqlx/` |

Run `just db-prepare` after changing a query or a migration, and commit `.sqlx/` with the change.
`just verify` runs it with `--check` and fails when the cache is stale.

Migrations only move forward and are never edited once they ship: a user's database has already
run them. Change the schema with a new migration.

## Settings

One row in `settings`, one column per setting, plus `keybinding_overrides` for shortcuts the user
changed. A `NULL` column means the user never chose a value, so the frontend applies its own
default. Defaults and UI rules (panel width limits, which shortcuts are allowed) live in the
frontend; the schema only rejects values the app never writes (an unknown theme, a blank font
name).

The frontend reads everything once with `get_settings` and saves each change with its own
command (`set_theme`, `set_sidebar_width`, ...). Outside the app (the Vite dev server in a
browser) the store keeps its defaults and saves nothing.

### Adding a setting

Say you add `zoom_level`:

1. **Migration:** `just db-new add_zoom_level`, then
   `ALTER TABLE settings ADD COLUMN zoom_level INTEGER CHECK (zoom_level > 0);`. Leave it nullable.
2. **Rust:** add `zoom_level: Option<u32>` to `Settings` and select it in `load` in
   [`settings.rs`](../src-tauri/src/settings.rs); add a `save_zoom_level` function, a
   `set_zoom_level` command in [`settings/commands.rs`](../src-tauri/src/settings/commands.rs), and
   register the command in `generate_handler!` in [`lib.rs`](../src-tauri/src/lib.rs).
3. **Query cache:** `just db-prepare`.
4. **TypeScript:** add `zoomLevel` to `SavedSettings` and a `setZoomLevel` wrapper in
   [`src/lib/settings-commands.ts`](../src/lib/settings-commands.ts). Nothing checks these against
   Rust, so match the command name and argument keys (camelCase here, snake_case in Rust).
5. **Store:** apply it in `load()` with its default, and add a setter, in
   [`src/stores/settings.ts`](../src/stores/settings.ts).
6. **Tests:** a round-trip case in `settings.rs`, and the store test in
   [`settings.test.ts`](../src/stores/settings.test.ts).

## Errors

A failed command rejects its `invoke` promise with `{ kind, message }`, where `kind` is
`database`, `migrate`, `io` or `tauri` (`Error` in [`error.rs`](../src-tauri/src/error.rs),
`CommandError` in TypeScript).
