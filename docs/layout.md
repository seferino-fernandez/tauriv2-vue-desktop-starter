# Layout

The window is laid out like VS Code or Obsidian:

```
┌──────────────────────────────────────────────────────┐
│ ● ● ●  [≡]               Page title                  │  titlebar
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

| Part | File | What it does |
| --- | --- | --- |
| Titlebar | `TitleBar.vue` | Full width. It holds the macOS traffic lights (or the Windows controls, on the right), the panel toggle, and the page title, centred. The rest of it drags the window. |
| Activity bar | `ActivityBar.vue`, `ActivityBarItem.vue` | Icons only, with tooltips; it never expands. Lists the pages from route meta. |
| Nested panel | `NestedPanel.vue` | The frame every page's panel shares: the location label, collapsing and resizing. The page supplies what goes inside. |
| Shell | `AppShell.vue` | Puts the parts together and owns the open state. |

## Behaviour

- **Collapsing:** the panel toggle, ⌘/Ctrl+B and clicking the current page's icon all show or hide the panel. It collapses completely; the activity bar stays.
- **Another page's icon** goes to that page and opens the panel if that page has one.
- **Resizing:** drag the panel's right edge (12–24rem), or focus it and use the arrow keys. Double-click the edge to reset it to 16rem.
- **Saved layout:** the open state (`sidebarOpen`) and width (`sidebarWidth`) are saved in `settings.json` and apply to every page.

## Adding a page

Add a route in [`src/router/index.ts`](../src/router/index.ts). Its `meta` puts it in the activity bar:

- `titleKey`: the i18n key of the page's name. It's the titlebar title, the tooltip and the panel's label.
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

The panel component renders only what goes below the label, so each page can lay out its own:

- [`pages/home/panel.vue`](../src/pages/home/panel.vue) is an explorer-style tree.
- [`pages/settings/panel.vue`](../src/pages/settings/panel.vue) is quick navigation. It jumps to a section of the page and highlights the one in view, using [`useScrollSpy`](../src/composables/useScrollSpy.ts). The page and the panel both read their sections from [`sections.ts`](../src/pages/settings/sections.ts).

Build panels from the `Sidebar*` components in `@/components/ui/sidebar` (`SidebarGroup`, `SidebarMenu`, `SidebarMenuButton`, …) so they match.

### Without a panel

Use `component` instead of `components`. The page then shows no panel and no toggle, and ⌘/Ctrl+B does nothing on it.

## Gotchas

- **Keep the titlebar mounted.** decorum looks for the `data-tauri-decorum-tb` element once, when the DOM is ready, and adds the Windows controls to it. That's why `main.ts` mounts the app straight away. The shell stays hidden until the saved layout has loaded.
- **The titlebar is 38px to match the macOS traffic lights.** decorum puts them back at its built-in inset (12, 16) whenever the window resizes, so their position can't change. If you change the titlebar's height, re-check in a screenshot that the lights are still centred.
- **The tooltips are not `SidebarMenuButton`'s `tooltip` prop.** That prop hides the tooltip unless the sidebar is collapsed, so `ActivityBarItem.vue` wraps the button in `Tooltip` itself.
- **Scroll position:** `window` doesn't scroll. To scroll the page, use the `<main id="app-content">` element (`CONTENT_ID` in [`src/lib/layout.ts`](../src/lib/layout.ts)).
- **Below 768px wide** shadcn-vue's provider switches to its mobile drawer, so the toggle, ⌘/Ctrl+B and the active icon stop working. `minWidth: 800` in `tauri.conf.json` keeps windows wider than that, except where a window manager ignores it (some tiling ones).
- **Linux** keeps the native titlebar. The app's titlebar still shows under it as a toolbar, without the gap for the traffic lights. See [Linux](./linux.md#native-window-decorations).
