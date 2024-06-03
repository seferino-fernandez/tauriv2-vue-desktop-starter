# tauriv2-vue-desktop-starter

A desktop application starter using the libraries and technologies:

- Rust

  - [Tauri v2](https://beta.tauri.app/start/) as the desktop application framework.
  - [Tauri Store Plugin](https://v2.tauri.app/plugin/store/) for persistence.

- Vue.js 3
  - [Shadcn Vue + Tailwind CSS](https://www.shadcn-vue.com/) for components.
  - [Vue Router](https://router.vuejs.org/) for application routing.
  - [Vue I18n](https://vue-i18n.intlify.dev/) for internationalization.
  - [Pinia](https://vue-i18n.intlify.dev/) for state management.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Prerequisites

Follow [Tauri's prerequisites guide](https://v2.tauri.app/start/prerequisites/) to setup your development environment.

Then rename all instances of `tauriv2-vue-desktop-starter` and `tauriv2_vue_desktop_starter` to your app name.

## Installation

Install dependencies with `bun install`

## Development`

For **Desktop** development, run: `bun tauri dev`

### Internationalization (i18n)

[Vue I18n](https://vue-i18n.intlify.dev/)

#### Adding a new language

Create a new JSON file in the [locales](./src/i18n/locales/) directory with the appropriate translations and the locale as the filename.

Then update the `supportedLanguages` function in [lib/config.ts](./src/lib/config.ts) to include the new language.

### Helpful Tips

Tauri Store Plugin stores `settings.json` at:

**macOS**: `~/Library/Application Support/com.github.tauriv2-vue-desktop-starter`

## Deployment

[Tauri v1 Deployment Guide](https://tauri.app/v1/guides/distribution/publishing)

To build a binary, run:

```bash
bun tauri build
```
