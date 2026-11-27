/** Nested panel width in px; drag its edge to resize, double-click the edge to reset */
export const PANEL_MIN_WIDTH = 192; // 12rem
export const PANEL_MAX_WIDTH = 384; // 24rem
export const PANEL_DEFAULT_WIDTH = 256; // 16rem
/** Arrow keys on the focused resize handle move the edge by this much */
export const PANEL_KEYBOARD_STEP = 16;

export function clampPanelWidth(width: number): number {
  return Math.round(Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, width)));
}

/** id of the shell's scroll container that holds the page */
export const CONTENT_ID = "app-content";
