//! Generates the Tauri context (config, capabilities, icons) that `tauri::generate_context!` embeds.

fn main() {
    // `sqlx::migrate!` embeds the migrations, so a new or edited one must rebuild the crate
    println!("cargo:rerun-if-changed=migrations");
    tauri_build::build();
}
