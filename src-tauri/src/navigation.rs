//! Keeps the webview on the app's own pages.
//!
//! A link or script that would load another page in the window is refused. Web and mail links
//! open in the user's default browser or mail app instead, so the app itself never loads remote
//! content.

use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager as _, Runtime, Url};

/// The plugin that checks every navigation in every webview.
pub(crate) fn guard<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("navigation-guard")
        .on_navigation(|webview, url| {
            // The dev server only serves the app under `tauri dev`
            let config = webview.app_handle().config();
            let dev_url = config.build.dev_url.as_ref().filter(|_| cfg!(dev));
            if is_app_url(url, dev_url) {
                return true;
            }
            if matches!(url.scheme(), "http" | "https" | "mailto") {
                if let Err(err) = tauri_plugin_opener::open_url(url.as_str(), None::<&str>) {
                    log::warn!("could not open {url} outside the app: {err}");
                }
            } else {
                log::warn!("refused to navigate to {url}");
            }
            false
        })
        .build()
}

/// Whether `url` is one of the app's own pages: bundled (`tauri://localhost`, or
/// `http://tauri.localhost` on Windows), or on the dev server.
fn is_app_url(url: &Url, dev_url: Option<&Url>) -> bool {
    url.scheme() == "tauri"
        || url.host_str() == Some("tauri.localhost")
        || url.scheme() == "about"
        || dev_url.is_some_and(|dev| url.origin() == dev.origin())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(text: &str) -> Url {
        Url::parse(text).unwrap()
    }

    #[test]
    fn allows_the_bundled_app() {
        assert!(is_app_url(&url("tauri://localhost/settings"), None));
        assert!(is_app_url(&url("http://tauri.localhost/"), None));
        assert!(is_app_url(&url("about:blank"), None));
    }

    #[test]
    fn allows_the_dev_server_only_when_given() {
        let dev = url("http://localhost:1420");
        assert!(is_app_url(
            &url("http://localhost:1420/settings"),
            Some(&dev)
        ));
        assert!(!is_app_url(&url("http://localhost:1420/"), None));
        assert!(!is_app_url(&url("http://localhost:8080/"), Some(&dev)));
    }

    #[test]
    fn refuses_other_sites() {
        assert!(!is_app_url(&url("https://example.com/"), None));
        assert!(!is_app_url(
            &url("https://tauri.localhost.example.com/"),
            None
        ));
        assert!(!is_app_url(&url("file:///etc/passwd"), None));
    }
}
