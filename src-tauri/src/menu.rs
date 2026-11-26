//! The macOS app menu: Tauri's default menu with a "Settings…" item in the app's own menu.
//!
//! Choosing the item asks the frontend to run its `openSettings` command, the one ⌘, runs. The
//! item shows that command's shortcut and follows it when the user changes it: the keybinding
//! commands call [`shortcut_changed`]. Windows and Linux get no native menu, so there the
//! frontend's own shortcut is the only way in.

use tauri::Manager as _;
use tauri::{AppHandle, Wry, menu::MenuItem};
#[cfg(target_os = "macos")]
use tauri::{
    Emitter as _,
    menu::{Menu, MenuItemKind, PredefinedMenuItem},
};

/// The frontend command the Settings… item runs, as `commands` in `src/lib/keybindings.ts` names it.
pub(crate) const OPEN_SETTINGS: &str = "openSettings";

/// `openSettings`'s default shortcut, mirroring `commands` in `src/lib/keybindings.ts`.
const OPEN_SETTINGS_DEFAULT: &str = "Mod+Comma";

/// The event that asks the frontend to run a command, with its id as the payload. The frontend
/// listens for it in `src/composables/useKeybindings.ts`.
#[cfg(target_os = "macos")]
const COMMAND_EVENT: &str = "command";

/// The Settings… item, kept so its shortcut can change. Only managed on macOS.
#[cfg_attr(
    not(target_os = "macos"),
    expect(dead_code, reason = "only macOS has the menu that creates it")
)]
struct SettingsItem(MenuItem<Wry>);

/// Replaces the default app menu with one that has a Settings… item, showing `saved` (the user's
/// own shortcut for it) or else the default.
#[cfg(target_os = "macos")]
pub(crate) fn install(app: &tauri::App, saved: Option<&str>) -> tauri::Result<()> {
    let handle = app.handle();
    let menu = Menu::default(handle)?;
    let item = MenuItem::with_id(handle, OPEN_SETTINGS, "Settings…", true, None::<&str>)?;
    show_shortcut(&item, saved);
    // The app's own menu comes first; Settings… goes under About, as in other Mac apps
    if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.first() {
        app_menu.insert_items(&[&item, &PredefinedMenuItem::separator(handle)?], 2)?;
    }
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id() == OPEN_SETTINGS
            && let Err(err) = app.emit(COMMAND_EVENT, OPEN_SETTINGS)
        {
            log::error!("could not ask the frontend to open the settings: {err}");
        }
    });
    app.manage(SettingsItem(item));
    Ok(())
}

/// Shows `command`'s new shortcut in the menu: `saved` is the user's own, `None` the default.
/// Does nothing for commands without a menu item, and where there is no menu.
pub(crate) fn shortcut_changed(app: &AppHandle, command: &str, saved: Option<&str>) {
    if command != OPEN_SETTINGS {
        return;
    }
    if let Some(item) = app.try_state::<SettingsItem>() {
        show_shortcut(&item.0, saved);
    }
}

/// Gives the item `saved` as its shortcut, or the default if `saved` is `None` or unreadable.
/// A shortcut the menu cannot show leaves the item without one; the frontend still handles it.
fn show_shortcut(item: &MenuItem<Wry>, saved: Option<&str>) {
    let shortcut = saved
        .and_then(accelerator)
        .or_else(|| accelerator(OPEN_SETTINGS_DEFAULT));
    if let Err(err) = item.set_accelerator(shortcut.as_deref()) {
        log::warn!("the menu cannot show the shortcut {shortcut:?}: {err}");
        if let Err(clear_err) = item.set_accelerator(None::<&str>) {
            log::warn!("could not clear the menu shortcut: {clear_err}");
        }
    }
}

/// A stored shortcut (`Mod+Shift+KeyK`) as a menu accelerator (`CmdOrCtrl+Shift+KeyK`), or
/// `None` if it is not one. The key keeps its `KeyboardEvent.code` name, which menus read too.
fn accelerator(binding: &str) -> Option<String> {
    let mut parts: Vec<&str> = binding.split('+').collect();
    let key = parts.pop().filter(|key| !key.is_empty())?;
    let mut accelerator = Vec::with_capacity(parts.len().saturating_add(1));
    for modifier in parts {
        accelerator.push(match modifier {
            "Mod" => "CmdOrCtrl",
            "Alt" => "Alt",
            "Shift" => "Shift",
            _ => return None,
        });
    }
    accelerator.push(key);
    Some(accelerator.join("+"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mod_becomes_cmd_or_ctrl() {
        assert_eq!(accelerator("Mod+Comma").as_deref(), Some("CmdOrCtrl+Comma"));
        assert_eq!(
            accelerator("Mod+Alt+Shift+KeyK").as_deref(),
            Some("CmdOrCtrl+Alt+Shift+KeyK")
        );
    }

    #[test]
    fn the_default_is_a_shortcut() {
        assert!(accelerator(OPEN_SETTINGS_DEFAULT).is_some());
    }

    #[test]
    fn what_is_not_a_shortcut_has_no_accelerator() {
        for binding in ["", "Mod+", "Hyper+KeyB", "Ctrl+KeyB"] {
            assert_eq!(accelerator(binding), None, "{binding}");
        }
    }
}
