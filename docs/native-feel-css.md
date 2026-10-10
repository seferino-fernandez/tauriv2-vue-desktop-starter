# Native-feel CSS

This app is built with Tauri: it's a real native app, but its UI runs inside a
WebView. Left alone, a WebView UI behaves like a web page — text gets selected on
click, the cursor turns into an I-beam over text, and the whole window scrolls with
a rubber-band bounce. A handful of global CSS rules in
[`src/assets/css/main.css`](../src/assets/css/main.css) smooth over those tells so
the app feels native on macOS.

## Font rendering

```css
:root {
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}
```

These give the UI OS-like text. `-webkit-font-smoothing: antialiased` and
`-moz-osx-font-smoothing: grayscale` match how macOS renders native app text,
`font-synthesis: none` avoids faux-bold/italic when a real weight is missing, and
`-webkit-text-size-adjust: 100%` stops the WebView from auto-resizing text.

## Non-selectable UI text

```css
body {
  user-select: none;
}
```

On a web page you can drag-select any text. Native apps generally don't let you
select chrome and labels, and accidental selection while clicking around the UI
feels broken. Disabling selection at the `body` level fixes that. Re-enable
selection locally (`user-select: text`) on anything genuinely meant to be copied.

## Default cursor (no I-beam)

```css
body {
  cursor: default;
}

button {
  cursor: pointer;
}
```

With text no longer selectable, the I-beam cursor over text is misleading.
`cursor: default` keeps the arrow cursor everywhere by default, like a native app.
Interactive elements then opt back in: `button { cursor: pointer }` restores the
pointer so clickable things still signal that they're clickable. Add `cursor:
pointer` to any other custom interactive elements you build.

## No window scroll / bounce

```css
body {
  overflow: hidden;
}
```

By default the whole window scrolls, and on macOS scrolling past the edge produces
the rubber-band "bounce." Native apps keep their frame fixed and scroll only the
content regions inside it. `overflow: hidden` on `body` removes the window-level
scroll (and its bounce). Make individual regions scrollable with their own
`overflow: auto`/`scroll` and a constrained height as needed.

## Cross-webview gotchas

The UI runs in a different engine on each OS: WebView2 (Chromium) on Windows,
WKWebView on macOS and WebKitGTK on Linux. A few CSS features behave differently
enough to bite:

- **`zoom` renders differently in WebKitGTK and WebView2.** To scale part of the
  UI, use `transform: scale()` (with `transform-origin`) so layout and
  rendering stay consistent across engines.
- **`filter: blur()` on a `<video>` fails silently in WebKitGTK.** The video
  just doesn't render. Bake the blur into the video file (e.g. with ffmpeg) or
  blur a static poster image instead.

Check the Linux build when you use filters, blend modes or video. See
[Linux](./linux.md) for platform-level notes.
