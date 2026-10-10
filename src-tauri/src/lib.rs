#[cfg(not(debug_assertions))]
use plugins::logging;

#[cfg(not(target_os = "linux"))]
use tauri::Manager;
#[cfg(not(target_os = "linux"))]
use tauri_plugin_decorum::WebviewWindowExt;

pub mod plugins;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        if let Err(err) = fix_path_env::fix() {
            log::warn!("fix-path-env failed: {err}; falling back to well-known dirs");
        }
    }
    let mut builder =
        tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|_, _, _| {}));

    // CrabNebula DevTools prevents other logging plugins from working
    // https://docs.crabnebula.dev/devtools/troubleshoot/log-plugins/
    #[cfg(debug_assertions)]
    {
        let devtools = tauri_plugin_devtools::init();
        builder = builder.plugin(devtools);
        builder = builder.plugin(tauri_plugin_pilot::init());
    }

    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(logging::tauri_plugin_logging());
    }
    builder
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![])
        .setup(|_app| {
            // Create a custom titlebar for main window
            // On Windows this hides decoration and creates custom window controls
            // On macOS it needs hiddenTitle: true and titleBarStyle: overlay
            // Linux keeps native decorations instead (see tauri.linux.conf.json and docs/linux.md)
            #[cfg(not(target_os = "linux"))]
            {
                let main_window = _app.get_webview_window("main").unwrap();
                main_window.create_overlay_titlebar().unwrap();

                // Some macOS-specific helpers
                #[cfg(target_os = "macos")]
                {
                    // Set a custom inset to the traffic lights
                    main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();

                    // Make window transparent without privateApi
                    main_window.make_transparent().unwrap();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
