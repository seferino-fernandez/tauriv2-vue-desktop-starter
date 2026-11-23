//! The Rust side of the Tauri v2 Vue desktop starter: it builds the app and opens its window.
//!
//! [`run`] is the only entry point, and the desktop binary's `main` calls it. It registers the
//! plugins the Vue frontend relies on and then hands control to Tauri's event loop. The process
//! exits when the app quits.
//!
//! # What `run` sets up
//!
//! - **One instance:** launching the app again while it is running does not open a second copy.
//! - **Plugins:** store (settings), window state, shell, dialog, file system and OS info.
//! - **Logging:** debug builds register `tauri-plugin-devtools` and `tauri-plugin-pilot`;
//!   release builds write logs through [`plugins::logging`].
//! - **Titlebar:** on Windows and macOS the main window draws its own titlebar
//!   (`tauri-plugin-decorum`). Linux keeps the native window decorations.
//! - **`PATH`:** on macOS and Linux, apps started from the Dock or a launcher get the login
//!   shell's `PATH`, so spawned commands resolve as they do in a terminal.
//!
//! # Examples
//!
//! A binary's `main` starts the app with one call:
//!
//! ```no_run
//! tauriv2_vue_desktop_starter_lib::run();
//! ```

#[cfg(not(debug_assertions))]
use plugins::logging;

#[cfg(not(target_os = "linux"))]
use tauri::Manager;
#[cfg(not(target_os = "linux"))]
use tauri_plugin_decorum::WebviewWindowExt;

pub mod plugins;

/// Builds the app, opens the main window and runs Tauri's event loop.
///
/// Never returns: when the app quits, Tauri exits the process, so code after the call does not
/// run. Call it once, from the binary's `main`.
///
/// # Panics
///
/// Panics if Tauri cannot build the app (a plugin fails to initialize or the main window cannot
/// be created), or, on Windows and macOS, if the main window is missing or its custom titlebar
/// cannot be applied.
///
/// # Examples
///
/// ```no_run
/// tauriv2_vue_desktop_starter_lib::run();
/// ```
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
                    // Set a custom inset to the traffic lights. Only (12, 16) holds: decorum moves
                    // them back to its built-in (12, 16) whenever the window resizes. The titlebar
                    // height in TitleBar.vue is matched to it, so leave these values alone.
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
