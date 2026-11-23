//! Generates the Tauri context (config, capabilities, icons) that `tauri::generate_context!` embeds.

fn main() {
    tauri_build::build();
}
