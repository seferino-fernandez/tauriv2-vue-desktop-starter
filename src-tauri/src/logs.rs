//! The log files, for the user to attach to a bug report. Nothing is sent anywhere.

use tauri::{AppHandle, Manager as _};

use crate::error::Result;

/// Opens the folder the log files are in, in Finder, Explorer or the file manager. It is created
/// first if nothing has been logged yet.
#[tauri::command]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri passes the app handle to commands by value"
)]
pub(crate) fn open_log_folder(app: AppHandle) -> Result<()> {
    let dir = app.path().app_log_dir()?;
    std::fs::create_dir_all(&dir)?;
    tauri_plugin_opener::open_path(&dir, None::<&str>).map_err(std::io::Error::other)?;
    Ok(())
}
