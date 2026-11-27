# Updater

The app can update itself, but only if you build it with the `updater` cargo feature. Without
it, which is the default, the updater code isn't compiled in and the app never goes online.

## How it works

Nothing happens until the user asks:

1. They click **Check for updates…** at the top of Settings, or **Check for Updates…** in the
   macOS app menu. Both only exist in builds with the feature.
2. The app downloads `latest.json` from your endpoint and says whether a newer version exists.
3. If one does, it downloads and installs it only when they click **Install**.
4. **Restart** appears once the install has finished. On Windows the installer closes the app
   itself.

There are no background checks. The requests come from Rust
([`src-tauri/src/updater.rs`](../src-tauri/src/updater.rs)), not the webview, so the Content
Security Policy stays as it is. The dialog is
[`src/components/UpdateDialog.vue`](../src/components/UpdateDialog.vue).

## Turn it on

1. Create a signing key. Every update is signed with it, and the app refuses any update that
   isn't:

   ```sh
   pnpm tauri signer generate -w ~/.tauri/my-app.key
   ```

   Keep the private key safe. If you lose it, apps already installed can't update any more.

2. In [`src-tauri/tauri.updater.conf.json`](../src-tauri/tauri.updater.conf.json), set `pubkey`
   to the contents of `my-app.key.pub`, and replace `OWNER/REPO` in the endpoint with your
   repository.
3. Add two repository secrets: `TAURI_SIGNING_PRIVATE_KEY`, the contents of `my-app.key`, and
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, its password. When the key is set,
   [`release.yml`](../.github/workflows/release.yml) builds with the feature and that config, and
   the release gets `latest.json` and the signed update files.
4. Push to `release` as usual. The workflow creates a draft release, and the endpoint only serves
   published releases, so users get the update when you publish the draft.

To try the updater locally, pass the same flags:

```sh
pnpm tauri dev --features updater --config src-tauri/tauri.updater.conf.json
```

## Hosting the updates yourself

The endpoint is a static JSON file, so any HTTPS server works: upload `latest.json` and the
files it points to, and put that URL in `endpoints`. See Tauri's
[updater guide](https://v2.tauri.app/plugin/updater/) for the file's format.

## Linux

AppImage, `.deb` and `.rpm` installs can update themselves. Packages built for a distro or
another package manager (AUR, Nix, Flathub) should leave the feature out, because the package
manager updates them.
