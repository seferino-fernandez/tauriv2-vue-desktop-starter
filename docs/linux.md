# Linux

Linux is a first-class target for this starter, including Wayland. These notes
explain the Linux-specific choices the starter makes and what to try when a
user's machine misbehaves.

## Native window decorations

On Windows and macOS the starter draws its own titlebar with
[`tauri-plugin-decorum`](https://github.com/clearlysid/tauri-plugin-decorum). On
Linux it keeps the system's native decorations instead:

- [`tauri.linux.conf.json`](../src-tauri/tauri.linux.conf.json) sets
  `"decorations": true`.
- [`lib.rs`](../src-tauri/src/lib.rs) only calls `create_overlay_titlebar()` on
  non-Linux platforms.
- [`main.ts`](../src/main.ts) sets `data-platform` on `<html>` (via
  [`src/lib/platform.ts`](../src/lib/platform.ts)), and
  [`AppTopbar.vue`](../src/components/AppTopbar.vue) hides itself with
  `in-data-[platform=linux]:hidden`, so the system titlebar isn't stacked on
  top of an empty app bar.

Why: Linux desktops disagree about window chrome. GNOME and KDE draw titlebars,
shadows and resize edges, while tiling compositors such as Hyprland or Sway draw
none at all. Native decorations let each compositor do what its users expect.
That includes resizing from the window edges, which a custom undecorated window
has to emulate. decorum's Linux controls also don't match this app's topbar or
light theme.

To use custom chrome on Linux anyway, set `"decorations": false` in
`tauri.linux.conf.json` and build your own controls with
`getCurrentWindow().minimize()`, `toggleMaximize()`, `close()`,
`startDragging()` and `startResizeDragging()`. Grant the matching
`core:window:allow-*` permissions in
[`capabilities/default.json`](../src-tauri/capabilities/default.json).

## Packages: prefer `.deb` / `.rpm`

The release workflow builds an AppImage, a `.deb` and an `.rpm`
(`bundle.targets: "all"`).

- **`.deb` / `.rpm`** link against the WebKitGTK installed on the user's system,
  so they pick up the distro's graphics stack and security updates. Recommend
  these first.
- **AppImage** bundles WebKitGTK and its dependencies from the build machine
  (`ubuntu-22.04` in CI). It's the portable fallback for distros without a
  package. AppImages built with `@tauri-apps/cli` **2.12 or newer**
  (tauri-bundler 2.10+) run natively on Wayland and no longer bundle the
  `libwayland`/`xkbcommon` libraries that caused `EGL_BAD_PARAMETER` crashes
  on newer Mesa. Don't downgrade the CLI below 2.12 if you ship AppImages.

## Why WebKitGTK isn't pinned in CI

Some Tauri apps pin `libwebkit2gtk-4.1` to an old version (e.g. 2.44.3) on the
CI runner to avoid EGL crashes on Wayland. This starter doesn't:

- A pin on the runner only changes the AppImage. `.deb` and `.rpm` always use
  the user's system WebKitGTK.
- The AppImage crash those pins worked around was a bundled-library conflict,
  which tauri-bundler 2.10 fixed.
- Pinning holds back WebKitGTK security fixes in everything the AppImage ships.

## Blank window, flicker or EGL errors

Most Linux rendering problems come from the user's GPU driver and compositor
combination, not from the app. Tauri's
[Linux graphics guide](https://v2.tauri.app/develop/debug/linux-graphics/)
suggests trying these in order, one at a time:

1. **NVIDIA drivers older than 545:** enable the `nvidia_drm.modeset=1` kernel
   parameter.
2. `__NV_DISABLE_EXPLICIT_SYNC=1` (NVIDIA)
3. `WEBKIT_DISABLE_DMABUF_RENDERER=1`
4. `WEBKIT_DISABLE_COMPOSITING_MODE=1` (last resort; disables accelerated
   compositing)

For example: `WEBKIT_DISABLE_DMABUF_RENDERER=1 ./my-app`.

The starter deliberately doesn't set any of these in code. They cost
performance or features for everyone to fix specific hardware. Only set one
unconditionally (e.g. with `std::env::set_var` at the top of `run()`) once
you've confirmed your app is affected.

## Other WebKitGTK differences

The webview on Linux is WebKitGTK, not Chromium (WebView2 on Windows) or
WKWebView (macOS). See [Native-feel CSS](./native-feel-css.md#cross-webview-gotchas)
for CSS that renders differently across them.
