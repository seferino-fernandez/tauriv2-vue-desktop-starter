use tauri::plugin::TauriPlugin;

pub fn tauri_plugin_logging() -> TauriPlugin<tauri::Wry> {
    tauri_plugin_log::Builder::new()
        .clear_targets()
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .level(log::LevelFilter::Info)
        .target(
            #[cfg(dev)]
            dev_logging_target(),
            #[cfg(not(dev))]
            prod_logging_target(),
        )
        .build()
}

fn dev_logging_target() -> tauri_plugin_log::Target {
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout)
}

fn prod_logging_target() -> tauri_plugin_log::Target {
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
        file_name: Some("logs".to_string()),
    })
}
