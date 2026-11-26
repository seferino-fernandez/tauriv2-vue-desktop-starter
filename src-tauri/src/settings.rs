//! The user's settings: what is saved, and how it is read and written.
//!
//! Every field is `None` until the user picks a value; the frontend then applies its own default.
//! Defaults and UI rules (panel width limits, which shortcuts are allowed) live in the frontend, so
//! this module only stores what it is given. The frontend calls it through [`commands`].

pub(crate) mod commands;

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::error::Result;

/// The app's color scheme. `Auto` follows the system's light or dark setting.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(rename_all = "lowercase")]
pub(crate) enum Theme {
    /// Always light.
    Light,
    /// Always dark.
    Dark,
    /// Follows the system.
    Auto,
}

/// Everything the user has saved, as the frontend receives it (camelCase keys).
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Settings {
    /// The chosen color scheme.
    pub(crate) theme: Option<Theme>,
    /// The interface language, as a locale such as `en`.
    pub(crate) language: Option<String>,
    /// The interface font family; `None` keeps the system font.
    pub(crate) font_family: Option<String>,
    /// Whether the nested panel is open.
    pub(crate) sidebar_open: Option<bool>,
    /// The nested panel's width in px.
    pub(crate) sidebar_width: Option<u32>,
    /// The shortcuts the user changed, by command id. Commands not listed keep their default.
    pub(crate) keybindings: BTreeMap<String, String>,
}

/// Reads every saved setting.
pub(crate) async fn load(pool: &SqlitePool) -> Result<Settings> {
    let row = sqlx::query!(
        r#"
        SELECT
            theme AS "theme: Theme",
            language,
            font_family,
            sidebar_open AS "sidebar_open: bool",
            sidebar_width AS "sidebar_width: u32"
        FROM settings
        WHERE id = 1
        "#
    )
    .fetch_one(pool)
    .await?;

    let keybindings = sqlx::query!("SELECT command, binding FROM keybinding_overrides")
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|override_| (override_.command, override_.binding))
        .collect();

    Ok(Settings {
        theme: row.theme,
        language: row.language,
        font_family: row.font_family,
        sidebar_open: row.sidebar_open,
        sidebar_width: row.sidebar_width,
        keybindings,
    })
}

/// Saves the color scheme.
pub(crate) async fn save_theme(pool: &SqlitePool, theme: Theme) -> Result<()> {
    sqlx::query!("UPDATE settings SET theme = ? WHERE id = 1", theme)
        .execute(pool)
        .await?;
    Ok(())
}

/// Saves the interface language.
pub(crate) async fn save_language(pool: &SqlitePool, language: &str) -> Result<()> {
    sqlx::query!("UPDATE settings SET language = ? WHERE id = 1", language)
        .execute(pool)
        .await?;
    Ok(())
}

/// Saves the interface font family; `None` goes back to the system font.
pub(crate) async fn save_font_family(pool: &SqlitePool, font_family: Option<&str>) -> Result<()> {
    sqlx::query!(
        "UPDATE settings SET font_family = ? WHERE id = 1",
        font_family
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Saves whether the nested panel is open.
pub(crate) async fn save_sidebar_open(pool: &SqlitePool, open: bool) -> Result<()> {
    sqlx::query!("UPDATE settings SET sidebar_open = ? WHERE id = 1", open)
        .execute(pool)
        .await?;
    Ok(())
}

/// Saves the nested panel's width in px.
pub(crate) async fn save_sidebar_width(pool: &SqlitePool, width: u32) -> Result<()> {
    sqlx::query!("UPDATE settings SET sidebar_width = ? WHERE id = 1", width)
        .execute(pool)
        .await?;
    Ok(())
}

/// Gives `command` its own shortcut, replacing any it had.
pub(crate) async fn save_keybinding(pool: &SqlitePool, command: &str, binding: &str) -> Result<()> {
    sqlx::query!(
        "INSERT INTO keybinding_overrides (command, binding) VALUES (?, ?)
         ON CONFLICT (command) DO UPDATE SET binding = excluded.binding",
        command,
        binding,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Removes `command`'s own shortcut, so it goes back to its default.
pub(crate) async fn delete_keybinding(pool: &SqlitePool, command: &str) -> Result<()> {
    sqlx::query!(
        "DELETE FROM keybinding_overrides WHERE command = ?",
        command
    )
    .execute(pool)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn nothing_is_saved_in_a_new_database(pool: SqlitePool) {
        assert_eq!(load(&pool).await.unwrap(), Settings::default());
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn saved_values_load_back(pool: SqlitePool) {
        save_theme(&pool, Theme::Dark).await.unwrap();
        save_language(&pool, "es").await.unwrap();
        save_font_family(&pool, Some("Inter")).await.unwrap();
        save_sidebar_open(&pool, false).await.unwrap();
        save_sidebar_width(&pool, 300).await.unwrap();
        save_keybinding(&pool, "togglePanel", "Mod+Shift+KeyB")
            .await
            .unwrap();

        let settings = load(&pool).await.unwrap();

        assert_eq!(
            settings,
            Settings {
                theme: Some(Theme::Dark),
                language: Some("es".into()),
                font_family: Some("Inter".into()),
                sidebar_open: Some(false),
                sidebar_width: Some(300),
                keybindings: BTreeMap::from([("togglePanel".into(), "Mod+Shift+KeyB".into())]),
            }
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn clearing_the_font_family_goes_back_to_none(pool: SqlitePool) {
        save_font_family(&pool, Some("Inter")).await.unwrap();
        save_font_family(&pool, None).await.unwrap();

        assert_eq!(load(&pool).await.unwrap().font_family, None);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn a_new_shortcut_replaces_the_old_one(pool: SqlitePool) {
        save_keybinding(&pool, "togglePanel", "Mod+KeyJ")
            .await
            .unwrap();
        save_keybinding(&pool, "togglePanel", "Mod+KeyK")
            .await
            .unwrap();

        let keybindings = load(&pool).await.unwrap().keybindings;

        assert_eq!(
            keybindings,
            BTreeMap::from([("togglePanel".into(), "Mod+KeyK".into())])
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn deleting_a_shortcut_restores_the_default(pool: SqlitePool) {
        save_keybinding(&pool, "togglePanel", "Mod+KeyJ")
            .await
            .unwrap();
        delete_keybinding(&pool, "togglePanel").await.unwrap();

        assert!(load(&pool).await.unwrap().keybindings.is_empty());
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn two_commands_cannot_share_a_shortcut(pool: SqlitePool) {
        save_keybinding(&pool, "togglePanel", "Mod+KeyJ")
            .await
            .unwrap();

        let result = save_keybinding(&pool, "other", "Mod+KeyJ").await;

        assert!(matches!(result, Err(crate::error::Error::Database(_))));
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn the_schema_rejects_values_the_app_never_writes(pool: SqlitePool) {
        for statement in [
            "UPDATE settings SET theme = 'purple'",
            "UPDATE settings SET font_family = '  '",
            "UPDATE settings SET sidebar_width = 0",
            "INSERT INTO settings (id) VALUES (2)",
        ] {
            let result = sqlx::query(statement).execute(&pool).await;
            assert!(result.is_err(), "{statement} should be rejected");
        }
    }
}
