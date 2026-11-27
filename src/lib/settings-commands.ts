/**
 * Typed wrappers for the settings commands in `src-tauri/src/settings/commands.rs`.
 *
 * Nothing checks these against the Rust side at build time, so when a command or its arguments
 * change there, change them here too. Arguments are camelCase here and snake_case in Rust.
 */
import { invoke } from "@tauri-apps/api/core";

/** `auto` follows the system's light or dark setting */
export type Theme = "light" | "dark" | "auto";

/** What the user has saved. `null` means never chosen, so the app's default applies. */
export interface SavedSettings {
  theme: Theme | null;
  /** A locale such as `en` */
  language: string | null;
  /** `null` keeps the system font */
  fontFamily: string | null;
  sidebarOpen: boolean | null;
  /** Nested panel width in px */
  sidebarWidth: number | null;
  /** Only the shortcuts the user changed, by command id */
  keybindings: Record<string, string>;
}

/** How a failed command rejects (`Error` in `src-tauri/src/error.rs`) */
export interface CommandError {
  kind: "database" | "migrate" | "io" | "tauri";
  message: string;
}

export function getSettings(): Promise<SavedSettings> {
  return invoke("get_settings");
}

export function setTheme(theme: Theme): Promise<void> {
  return invoke("set_theme", { theme });
}

export function setLanguage(language: string): Promise<void> {
  return invoke("set_language", { language });
}

export function setFontFamily(fontFamily: string | null): Promise<void> {
  return invoke("set_font_family", { fontFamily });
}

export function setSidebarOpen(open: boolean): Promise<void> {
  return invoke("set_sidebar_open", { open });
}

export function setSidebarWidth(width: number): Promise<void> {
  return invoke("set_sidebar_width", { width });
}

/** Gives `command` its own shortcut */
export function setKeybinding(command: string, binding: string): Promise<void> {
  return invoke("set_keybinding", { command, binding });
}

/** Puts `command` back on its default shortcut */
export function resetKeybinding(command: string): Promise<void> {
  return invoke("reset_keybinding", { command });
}
