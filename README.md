# tauriv2-vue-desktop-starter

[Tauri v2](https://beta.tauri.app/start/)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Installation

`bun install`

## Development`

For **Desktop** development, run: `bun tauri dev`

### Internationalization (i18n)

[Vue I18n](https://vue-i18n.intlify.dev/)

#### Adding a new language

Create a new JSON file in the [locales](./src/i18n/locales/) directory with the appropriate translations and the locale as the filename.

Then update the `supportedLanguages` function in [lib/config.ts](./src/lib/config.ts) to include the new language.

### Helpful Tips

Tauri stores `settings.json` at:

**macOS**: `~/Library/Application Support/com.github.tauriv2-vue-desktop-starter`

## Deployment

To build a binary, run:

```bash
bun tauri build
```
