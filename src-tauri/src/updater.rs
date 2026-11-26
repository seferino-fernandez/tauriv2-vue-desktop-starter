//! In-app updates, built only with the `updater` feature (see `docs/updater.md`).
//!
//! The app never checks on its own. When the user asks, the frontend calls [`check_for_update`];
//! if they then choose to install, [`install_update`]; and once that has finished, [`restart_app`].
#![expect(
    clippy::unreachable,
    reason = "`#[tauri::command]` expands each async command into code that uses `unreachable!`"
)]

use std::sync::{Mutex, PoisonError};

use serde::Serialize;
use tauri::{AppHandle, State, ipc::Channel};
use tauri_plugin_updater::{Update, UpdaterExt as _};

use crate::error::Result;

/// The update [`check_for_update`] found, kept until the user installs it.
#[derive(Default)]
pub(crate) struct PendingUpdate(Mutex<Option<Update>>);

/// A newer version than the one running.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AvailableUpdate {
    version: String,
    current_version: String,
}

/// How much of the update has downloaded, in bytes. `total` is `None` if the server did not say.
#[derive(Clone, Serialize)]
pub(crate) struct Progress {
    downloaded: u64,
    total: Option<u64>,
}

/// Asks the update endpoint for a newer version. `None` means this one is the latest.
#[tauri::command]
pub(crate) async fn check_for_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
) -> Result<Option<AvailableUpdate>> {
    let update = app.updater()?.check().await?;
    let available = update.as_ref().map(|update| AvailableUpdate {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
    });
    *pending.0.lock().unwrap_or_else(PoisonError::into_inner) = update;
    Ok(available)
}

/// Downloads and installs the update [`check_for_update`] found, sending progress as it goes.
///
/// On Windows the installer closes the app itself, so this does not return there.
#[tauri::command]
pub(crate) async fn install_update(
    pending: State<'_, PendingUpdate>,
    on_progress: Channel<Progress>,
) -> Result<()> {
    let update = pending
        .0
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .take()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "no update to install"))?;
    let mut downloaded: u64 = 0;
    update
        .download_and_install(
            |chunk, total| {
                downloaded = downloaded.saturating_add(u64::try_from(chunk).unwrap_or(u64::MAX));
                if let Err(err) = on_progress.send(Progress { downloaded, total }) {
                    log::warn!("could not send the download progress: {err}");
                }
            },
            || {},
        )
        .await?;
    Ok(())
}

/// Restarts the app into the version [`install_update`] installed.
#[tauri::command]
#[expect(
    clippy::needless_pass_by_value,
    reason = "a command receives the app handle by value"
)]
pub(crate) fn restart_app(app: AppHandle) {
    app.restart();
}
