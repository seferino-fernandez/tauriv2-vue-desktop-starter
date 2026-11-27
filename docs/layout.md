# Layout

The window is laid out like VS Code or Obsidian:

```
┌──────────────────────────────────────────────────────┐
│ ● ● ●  [≡]                                           │  titlebar
├────┬──────────────┬──────────────────────────────────┤
│ ⌂  │ PAGE LABEL   │                                  │
│    │              │                                  │
│    │ page's panel │  page                            │
│    │              │                                  │
│ ⚙  │              │                                  │
└────┴──────────────┴──────────────────────────────────┘
 activity  nested panel   content (the only part that scrolls)
 bar
```

All of it lives in [`src/components/shell/`](../src/components/shell/):

| Part         | File                                     | What it does                                                                                                                                  |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Titlebar     | `TitleBar.vue`                           | Full width. It holds the macOS traffic lights (or the Windows controls, on the right), and the panel toggle. The rest of it drags the window. |
| Activity bar | `ActivityBar.vue`, `ActivityBarItem.vue` | Icons only, with tooltips; it never expands. Lists the pages from route meta.                                                                 |
| Nested panel | `NestedPanel.vue`                        | The frame every page's panel shares: the location label, collapsing and resizing. The page supplies what goes inside.                         |
| Shell        | `AppShell.vue`                           | Puts the parts together and owns the open state.                                                                                              |

## Behaviour

- **Collapsing:** the panel toggle, its keyboard shortcut (⌘/Ctrl+B by default) and clicking the current page's icon all show or hide the panel. It collapses completely; the activity bar stays.
- **Another page's icon** goes to that page and opens the panel if that page has one.
- **Resizing:** drag the panel's right edge (12–24rem), or focus it and use the arrow keys. Double-click the edge to reset it to 16rem.
- **Saved layout:** the open state (`sidebarOpen`) and width (`sidebarWidth`) are saved in the [database](./database.md) and apply to every page.

## Keyboard shortcuts

Shortcuts can be changed in Settings → Keyboard shortcuts. The commands, their defaults and the rules a shortcut must follow are in [`src/lib/keybindings.ts`](../src/lib/keybindings.ts):

- **Stored form:** `Mod+Shift+KeyB`. `Mod` is ⌘ on macOS and Ctrl elsewhere, and the key is a physical position (`KeyboardEvent.code`), so ⌥ combos and non-Latin layouts work. Only changed shortcuts are saved, in the [database](./database.md)'s `keybinding_overrides` table.
- **Refused:** shortcuts without `Mod`, the ones in `RESERVED_KEYBINDINGS` (quit, close, copy, paste, undo, ...), and one another command already uses.
- **Adding a command:** add it to `commands`, give its `titleKey` a translation, and handle it in [`AppShell`](../src/components/shell/AppShell.vue)'s table. It shows up in settings and the command palette by itself.
- **Commands that open a page:** give the route `meta.command`. The shortcut then goes to that page (opening its panel, like clicking its icon) and the icon's tooltip shows it. Settings has `openSettings`, ⌘/Ctrl+, by default.
- **macOS app menu:** [`src-tauri/src/menu.rs`](../src-tauri/src/menu.rs) adds "Settings…" to Tauri's default menu. It sends the `command` event that `useKeybindings` listens for, and its shortcut follows `openSettings`'s: the keybinding commands update it. Windows and Linux have no native menu.

The ⌘/Ctrl+B listener in shadcn-vue's `SidebarProvider.vue` is deleted on purpose. If a CLI update brings it back, delete it again, or the panel toggles twice.

## Adding a page

The starter has no pages at the top of the activity bar: Settings is pinned to the bottom, and `/` redirects to it. Your pages go at the top. Point the `/` redirect at your first one.

Add a route in [`src/router/index.ts`](../src/router/index.ts). Its `meta` puts it in the activity bar:

- `titleKey`: the i18n key of the page's name. It's the activity bar tooltip and the panel's label.
- `icon`: an [unplugin-icons](./offline.md#icons) component.
- `nav`: `'main'` (top of the activity bar) or `'footer'` (pinned to the bottom). Leave it out to keep the page out of the activity bar.

### With a panel

Give the route a `sidebar` named view next to its `default` one:

```ts
{
  path: 'notes',
  name: 'notes',
  components: {
    default: () => import('@/pages/notes/index.vue'),
    sidebar: () => import('@/pages/notes/panel.vue'),
  },
  meta: { titleKey: 'notes.label', icon: IconNotebook, nav: 'main' },
}
```

The panel component renders only what goes below the label, so each page lays out its own. [`pages/settings/panel.vue`](../src/pages/settings/panel.vue) is quick navigation: it jumps to a section of the page and highlights the one in view, using [`useScrollSpy`](../src/composables/useScrollSpy.ts). The page and the panel both read their sections from [`sections.ts`](../src/pages/settings/sections.ts).

Build panels from the `Sidebar*` components in `@/components/ui/sidebar` (`SidebarGroup`, `SidebarMenu`, `SidebarMenuButton`, …) so they match.

### Without a panel

Use `component` instead of `components`. The page then shows no panel and no toggle, and the panel shortcut does nothing on it.

## Gotchas

- **Keep the titlebar mounted.** decorum looks for the `data-tauri-decorum-tb` element once, when the DOM is ready, and adds the Windows controls to it. That's why `main.ts` mounts the app straight away. The shell stays hidden until the saved layout has loaded.
- **The titlebar is 38px to match the macOS traffic lights.** decorum puts them back at its built-in inset (12, 16) whenever the window resizes, so their position can't change. If you change the titlebar's height, re-check in a screenshot that the lights are still centred.
- **The tooltips are not `SidebarMenuButton`'s `tooltip` prop.** That prop hides the tooltip unless the sidebar is collapsed, so `ActivityBarItem.vue` wraps the button in `Tooltip` itself.
- **Scroll position:** `window` doesn't scroll. To scroll the page, use the `<main id="app-content">` element (`CONTENT_ID` in [`src/lib/layout.ts`](../src/lib/layout.ts)).
- **Below 768px wide** shadcn-vue's provider switches to its mobile drawer, so the toggle and the active icon stop working (the keyboard shortcut still works). `minWidth: 800` in `tauri.conf.json` keeps windows wider than that, except where a window manager ignores it (some tiling ones).
- **Linux** keeps the native titlebar. The app's titlebar still shows under it as a toolbar, without the gap for the traffic lights. See [Linux](./linux.md#native-window-decorations).
