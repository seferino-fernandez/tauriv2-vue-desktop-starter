//! The settings commands the frontend calls with `invoke`.
//!
//! Each one is a thin wrapper: it takes the managed pool and hands the work to the module above.
//! Their names and argument keys (camelCase in JS) are mirrored by `src/lib/settings-commands.ts`.
#![expect(
    clippy::unreachable,
    reason = "`#[tauri::command]` expands each command into code that uses `unreachable!`"
)]

use sqlx::SqlitePool;
use tauri::State;

use super::{Settings, Theme};
use crate::error::Result;

/// Returns everything the user has saved.
#[tauri::command]
pub(crate) async fn get_settings(pool: State<'_, SqlitePool>) -> Result<Settings> {
    super::load(&pool).await
}

/// Saves the color scheme.
#[tauri::command]
pub(crate) async fn set_theme(pool: State<'_, SqlitePool>, theme: Theme) -> Result<()> {
    super::save_theme(&pool, theme).await
}

/// Saves the interface language.
#[tauri::command]
pub(crate) async fn set_language(pool: State<'_, SqlitePool>, language: String) -> Result<()> {
    super::save_language(&pool, &language).await
}

/// Saves the interface font family; `null` goes back to the system font.
#[tauri::command]
pub(crate) async fn set_font_family(
    pool: State<'_, SqlitePool>,
    font_family: Option<String>,
) -> Result<()> {
    super::save_font_family(&pool, font_family.as_deref()).await
}

/// Saves whether the nested panel is open.
#[tauri::command]
pub(crate) async fn set_sidebar_open(pool: State<'_, SqlitePool>, open: bool) -> Result<()> {
    super::save_sidebar_open(&pool, open).await
}

/// Saves the nested panel's width in px.
#[tauri::command]
pub(crate) async fn set_sidebar_width(pool: State<'_, SqlitePool>, width: u32) -> Result<()> {
    super::save_sidebar_width(&pool, width).await
}

/// Gives `command` its own shortcut.
#[tauri::command]
pub(crate) async fn set_keybinding(
    pool: State<'_, SqlitePool>,
    command: String,
    binding: String,
) -> Result<()> {
    super::save_keybinding(&pool, &command, &binding).await
}

/// Puts `command` back on its default shortcut.
#[tauri::command]
pub(crate) async fn reset_keybinding(pool: State<'_, SqlitePool>, command: String) -> Result<()> {
    super::delete_keybinding(&pool, &command).await
}
