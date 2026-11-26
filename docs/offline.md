# Offline by default

The shipped app makes no network calls to third parties. Everything the UI needs is
bundled at build time, and a Content Security Policy blocks anything that slips in.

## Icons

Icons come from [Iconify](https://iconify.design/) sets but are compiled into the
bundle by [`unplugin-icons`](https://github.com/unplugin/unplugin-icons), so only the
icons you import ship, and nothing is fetched at runtime (`@iconify/vue`'s `<Icon>`
downloads from `api.iconify.design` by default, which is why it isn't used here).

```ts
import IconHouse from '~icons/ph/house-duotone'
```

To use another set, install its data package (e.g. `pnpm add -D @iconify-json/lucide`)
and import from `~icons/lucide/...`. Browse names at [icones.js.org](https://icones.js.org/).

The generated shadcn-vue components under `src/components/ui/` import `@lucide/vue`,
which is also bundled. Leave those as the CLI writes them.

## Font

The UI uses the system font stack (Tailwind's default `--font-sans`). `components.json`
has no `font` entry on purpose: when it names a font, `shadcn-vue add` re-inserts a Google
Fonts `@import` into `src/assets/css/tailwind.css` every time a component brings CSS
variables. Re-running `shadcn-vue init` or applying a preset asks for a font again;
remove the import it writes. To ship a custom font, bundle it (e.g. an `@fontsource`
package) instead of linking a CDN.

Users can switch the UI to another font in Settings, but only to one already installed on
their computer; nothing is fetched. See [App font](./fonts.md).

## Content Security Policy

`app.security.csp` in [`tauri.conf.json`](../src-tauri/tauri.conf.json) only allows the
app's own origin plus Tauri's IPC:

| Directive | Value | Why |
| --- | --- | --- |
| `default-src` | `'self'` | Nothing from other origins |
| `script-src` | `'self'` | No inline or injected scripts |
| `style-src` | `'self' 'unsafe-inline'` | Vue/reka style bindings and decorum's injected `<style>` (Windows controls) |
| `img-src` / `font-src` | `'self' data:` | Bundled assets and data URIs |
| `connect-src` | `'self' ipc: http://ipc.localhost` | Tauri IPC (`http://ipc.localhost` on Windows) |
| `object-src` / `base-uri` | `'none'` / `'self'` | Hardening |

Gotchas:

- **The CSP is only enforced in a built app.** Tauri attaches it to the assets it serves
  itself; `tauri dev` loads the Vite server directly, without it. Check for violations in
  the WebView console of `just build` (`pnpm tauri build --debug`).
- **Don't add inline `<style>` or `<script>` tags to `index.html`.** Tauri hashes inline
  tags it finds at build time and adds the hashes to the policy, and a hash in
  `style-src` makes the browser ignore `'unsafe-inline'`. Styles injected at runtime
  (decorum's Windows window controls among them) would then break silently.
- **`tauri-pilot eval` fails in built apps** ("Refused to evaluate a string as JavaScript"):
  the policy has no `'unsafe-eval'`. Snapshots, clicks and screenshots still work; for `eval`,
  use `just dev`, which runs without the CSP.
- If the app genuinely needs a remote origin (an API, an update server), add that origin
  to the one directive that needs it rather than loosening `default-src`.
