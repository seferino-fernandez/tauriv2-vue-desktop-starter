//! Logging for release builds, written to files in the app's log directory.

use tauri::plugin::TauriPlugin;

/// Creates the logging plugin: `Info` and above, to rotating files in the app's log directory.
///
/// Debug builds of this function log to stdout instead. The rotated files are all kept.
///
/// # Examples
///
/// ```no_run
/// use tauriv2_vue_desktop_starter_lib::plugins::logging::tauri_plugin_logging;
///
/// tauri::Builder::default()
///     .plugin(tauri_plugin_logging())
///     .run(tauri::generate_context!())?;
/// # Ok::<(), tauri::Error>(())
/// ```
pub fn tauri_plugin_logging() -> TauriPlugin<tauri::Wry> {
    tauri_plugin_log::Builder::new()
        .clear_targets()
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .level(log::LevelFilter::Info)
        .target(
            #[cfg(debug_assertions)]
            dev_logging_target(),
            #[cfg(not(debug_assertions))]
            prod_logging_target(),
        )
        .build()
}

#[cfg_attr(
    all(not(debug_assertions), not(test)),
    expect(dead_code, reason = "used only by debug builds and the tests")
)]
fn dev_logging_target() -> tauri_plugin_log::Target {
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout)
}

#[cfg_attr(
    all(debug_assertions, not(test)),
    expect(dead_code, reason = "used only by release builds and the tests")
)]
fn prod_logging_target() -> tauri_plugin_log::Target {
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
        file_name: Some("logs".to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dev_logging_target_creates_stdout_target() {
        let _target = dev_logging_target();
    }

    #[test]
    fn prod_logging_target_creates_logdir_target() {
        let _target = prod_logging_target();
    }
}
