//! The Rust side of the Tauri v2 Vue desktop starter: it builds the app and opens its window.
//!
//! [`run`] is the only entry point, and the desktop binary's `main` calls it. It registers the
//! plugins the Vue frontend relies on and then hands control to Tauri's event loop. The process
//! exits when the app quits.
//!
//! # What `run` sets up
//!
//! - **One instance:** launching the app again while it is running does not open a second copy;
//!   it brings the running app's window to the front instead.
//! - **Settings:** saved in a SQLite database in the app data directory. It is opened and
//!   migrated before the window shows, and the frontend reads and writes it through the settings
//!   commands.
//! - **App menu:** on macOS, Tauri's default menu plus a "Settings…" item that follows the
//!   user's shortcut for it (`src/menu.rs`).
//! - **Plugins:** window state, OS info and installed fonts.
//! - **Updates:** only with the `updater` feature, and only when the user asks (`src/updater.rs`).
//! - **Logging:** debug builds register `tauri-plugin-devtools` and `tauri-plugin-pilot`;
//!   release builds write logs through [`plugins::logging`]. Panics are logged too, with a
//!   backtrace.
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

use tauri::Manager as _;
#[cfg(not(target_os = "linux"))]
use tauri_plugin_decorum::WebviewWindowExt;
use tauri_plugin_window_state::StateFlags;

mod db;
mod error;
mod menu;
mod panic_hook;
pub mod plugins;
mod settings;
#[cfg(feature = "updater")]
mod updater;

/// Builds the app, opens the main window and runs Tauri's event loop.
///
/// Never returns: when the app quits, Tauri exits the process, so code after the call does not
/// run. Call it once, from the binary's `main`.
///
/// # Panics
///
/// Panics if Tauri cannot build the app: a plugin fails to initialize, the main window cannot be
/// created, the database cannot be opened or migrated, or, on Windows and macOS, the main window
/// is missing or its custom titlebar cannot be applied.
///
/// # Examples
///
/// ```no_run
/// tauriv2_vue_desktop_starter_lib::run();
/// ```
#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[expect(
    clippy::expect_used,
    reason = "the app has nothing to fall back to when Tauri cannot start"
)]
#[expect(
    clippy::items_after_statements,
    reason = "`generate_handler!` expands each command's handler here, after the builder statements"
)]
pub fn run() {
    panic_hook::install();

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        if let Err(err) = fix_path_env::fix() {
            log::warn!("fix-path-env failed: {err}; falling back to well-known dirs");
        }
    }
    let mut builder =
        tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }));

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

    // In-app updates only exist in builds with the `updater` feature (docs/updater.md)
    #[cfg(feature = "updater")]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .manage(updater::PendingUpdate::default());
    }

    builder
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fontgres::init())
        // Restoring VISIBLE or DECORATIONS too would fight the custom titlebar and the window config
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            settings::commands::get_settings,
            settings::commands::set_theme,
            settings::commands::set_language,
            settings::commands::set_font_family,
            settings::commands::set_sidebar_open,
            settings::commands::set_sidebar_width,
            settings::commands::set_keybinding,
            settings::commands::reset_keybinding,
            updater_available,
            #[cfg(feature = "updater")]
            updater::check_for_update,
            #[cfg(feature = "updater")]
            updater::install_update,
            #[cfg(feature = "updater")]
            updater::restart_app,
        ])
        // Tauri keeps only the last `setup`, so everything that runs at startup goes here
        .setup(|app| {
            // Linux keeps native decorations instead (see docs/linux.md)
            #[cfg(not(target_os = "linux"))]
            decorate_main_window(app)?;

            // Settings load as soon as the frontend starts, so the database is ready before it is
            let pool = tauri::async_runtime::block_on(db::open(app.handle()))
                .inspect_err(|err| log::error!("could not open the database: {err}"))?;

            #[cfg(target_os = "macos")]
            {
                // A missing shortcut is no reason not to start: the menu shows the default
                let mut saved = tauri::async_runtime::block_on(settings::load(&pool))
                    .inspect_err(|err| log::error!("could not read the saved shortcuts: {err}"))
                    .map_or_default(|settings| settings.keybindings);
                menu::install(app, saved.remove(menu::OPEN_SETTINGS).as_deref())?;
            }

            app.manage(pool);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Whether this build can update itself (the `updater` feature), so the frontend knows to offer it.
#[tauri::command]
fn updater_available() -> bool {
    cfg!(feature = "updater")
}

/// Brings the main window to the front, e.g. when the app is launched a second time.
fn show_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let shown = window
        .unminimize()
        .and_then(|()| window.show())
        .and_then(|()| window.set_focus());
    if let Err(err) = shown {
        log::warn!("could not bring the main window to the front: {err}");
    }
}

/// Replaces the main window's titlebar with the app's own.
///
/// On Windows this hides the native decorations and decorum adds its own window controls. On
/// macOS it needs `hiddenTitle: true` and `titleBarStyle: "Overlay"` in the window config.
#[cfg(not(target_os = "linux"))]
fn decorate_main_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let main_window = app
        .get_webview_window("main")
        .ok_or("the main window is missing")?;
    main_window.create_overlay_titlebar()?;

    #[cfg(target_os = "macos")]
    {
        // Set a custom inset to the traffic lights. Only (12, 16) holds: decorum moves them back
        // to its built-in (12, 16) whenever the window resizes. The titlebar height in
        // TitleBar.vue is matched to it, so leave these values alone.
        main_window.set_traffic_lights_inset(12.0, 16.0)?;

        // Make window transparent without privateApi
        main_window.make_transparent()?;
    }

    Ok(())
}
