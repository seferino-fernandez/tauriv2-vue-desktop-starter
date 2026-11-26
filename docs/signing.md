# Signing releases

Unsigned apps still run, but each OS makes users work for it: macOS asks them to allow the app
in System Settings, and Windows SmartScreen warns before it runs (Smart App Control blocks it
outright). The release workflow signs whatever it has secrets for, and builds the rest unsigned.

## macOS

With these repository secrets, `release.yml` signs the app with your Developer ID and has Apple
notarize it. Without them it is ad-hoc signed (`signingIdentity: "-"` in
[`tauri.macos.conf.json`](../src-tauri/tauri.macos.conf.json)).

| Secret | What it is |
| --- | --- |
| `APPLE_CERTIFICATE` | Your *Developer ID Application* certificate exported as `.p12`, base64-encoded: `openssl base64 -in cert.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | The password you exported the `.p12` with |
| `APPLE_SIGNING_IDENTITY` | The certificate's name, e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | The Apple ID that notarizes |
| `APPLE_PASSWORD` | An [app-specific password](https://support.apple.com/102654) for that Apple ID |
| `APPLE_TEAM_ID` | Your team ID, from your Apple Developer account |

The first three sign; the last three notarize. A Developer ID certificate needs a paid Apple
Developer account. See Tauri's [macOS signing guide](https://v2.tauri.app/distribute/sign/macos/)
for creating the certificate, or for notarizing with an App Store Connect API key instead.

## Windows

The workflow doesn't sign Windows builds: how you sign depends on where your certificate
lives. An OV certificate in a cloud HSM, or Azure Trusted Signing, plugs in through
`bundle.windows.signCommand`; a certificate imported on the runner uses
`certificateThumbprint`. Tauri's [Windows signing guide](https://v2.tauri.app/distribute/sign/windows/)
covers each. Even signed, a new app builds SmartScreen reputation over time.

## Linux

Nothing to do: `.deb`, `.rpm` and AppImage files aren't signed by default.
