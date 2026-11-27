# App font

The interface uses the system font by default. In **Settings → Appearance → App font** the user
can pick any font family installed on their computer instead. The choice applies at once and is
saved with the other settings.

The fonts are found by [`tauri-plugin-fontgres`](https://github.com/seferino-fernandez/tauri-plugin-fontgres),
which reads the fonts installed on the system. Nothing is downloaded: the app only offers fonts
that are already installed, so it stays [offline](./offline.md).

## How it fits together

| Piece      | Where                                                                                                  | What it does                                            |
| ---------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Plugin     | `.plugin(tauri_plugin_fontgres::init())` in [`lib.rs`](../src-tauri/src/lib.rs)                        | Lists the installed font families                       |
| Permission | `fontgres:allow-get-families` in [`capabilities/default.json`](../src-tauri/capabilities/default.json) | Lets the frontend call `getFamilies()` and nothing else |
| Picker     | [`FontSetting.vue`](../src/pages/settings/FontSetting.vue)                                             | A searchable list of families, each with a sample       |
| Store      | `fontFamily` and `setFontFamily` in [`stores/settings.ts`](../src/stores/settings.ts)                  | Applies the choice and saves it                         |
| CSS        | `--app-font-family` in [`tailwind.css`](../src/assets/css/tailwind.css)                                | Puts the chosen family in front of the system stack     |
| Storage    | The `font_family` column (see [Database](./database.md))                                               | `NULL` means the system font                            |

## Applying the font

The store sets `--app-font-family` on `<html>` to the chosen family followed by the system
stack (`fontStack` in [`src/lib/fonts.ts`](../src/lib/fonts.ts)), so a character the font lacks
still renders. Tailwind's `font-ui` and `font-heading` read that variable and fall back to
`--font-sans` when it is unset, and `html` uses `font-ui`, so the whole UI follows the choice.
**System default** removes the variable.

The picker itself is pinned to `font-sans`, so it stays readable whatever font is chosen. Use
`font-sans` the same way on anything else that must not change with the setting.

## Behaviour worth knowing

- **Saved before applied.** `setFontFamily` saves first and only then changes the font, so a
  failed save leaves the old font in place and the picker shows an error.
- **Uninstalled fonts.** If the saved family is no longer installed, the UI falls back to the
  system font and the picker says so. The saved value is kept, so reinstalling the font brings it
  back.
- **Listed once.** The plugin reads the system fonts on the first call and keeps them, and the
  picker keeps the list it got. A font installed while the app runs shows up after a restart.
  The plugin has a `reload()` command for this; to use it, grant `fontgres:allow-reload` too.
- **Hidden families.** Families whose name starts with `.` (Apple's private UI faces such as
  `.SF NS`) are left out, because CSS cannot select them by name.
- **Desktop only.** On Android and iOS the plugin's commands fail, and the picker shows its
  load error.
- **Plain browser.** Under the Vite dev server outside Tauri the font list cannot load, so the
  picker shows its load error and the UI keeps the system font.

## Using more of the plugin

The plugin can also list every face of a family (weights, styles, file paths) and pick the best
installed match for a CSS font query. See its
[README](https://github.com/seferino-fernandez/tauri-plugin-fontgres#usage) for `getFaces`,
`queryFace` and `reload`, and grant the matching `fontgres:allow-*` permission for each one you
call.

## Updating the plugin

The crate (`tauri-plugin-fontgres` in [`Cargo.toml`](../src-tauri/Cargo.toml)) and the npm
package (`tauri-plugin-fontgres-api` in [`package.json`](../package.json)) are pinned to exact
versions. Move them together. The npm package is also listed under `minimumReleaseAgeExclude` in
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml) with its version, so update that entry as well.
