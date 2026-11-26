//! The app's SQLite database: where it lives, how it is opened, and its migrations.
//!
//! [`open`] runs once at startup and the pool it returns is managed as Tauri state, so a command
//! takes it as `State<'_, SqlitePool>`. Migrations live in `src-tauri/migrations` and are
//! embedded in the binary.

use std::path::Path;
use std::time::Duration;

use sqlx::SqlitePool;
use sqlx::migrate::Migrator;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqliteSynchronous};
use tauri::{AppHandle, Manager as _};

use crate::error::Result;

/// Every migration in `src-tauri/migrations`, embedded at compile time.
pub(crate) static MIGRATOR: Migrator = sqlx::migrate!();

/// Debug builds keep their own file, so `just dev` never migrates or overwrites the database of
/// the installed release build.
const FILE_NAME: &str = if cfg!(debug_assertions) {
    "app-dev.db"
} else {
    "app.db"
};

/// Opens the database in the app data directory, creating it if needed, and applies any pending
/// migrations.
///
/// Fails if the database cannot be opened, or holds a migration this build does not know (it was
/// last opened by a newer version of the app).
pub(crate) async fn open(app: &AppHandle) -> Result<SqlitePool> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;
    let path = dir.join(FILE_NAME);
    log::info!("opening the database at {}", path.display());
    connect(&path).await
}

/// Opens or creates the database file at `path` and migrates it.
async fn connect(path: &Path) -> Result<SqlitePool> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePool::connect_with(options).await?;
    MIGRATOR.run(&pool).await?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn creates_and_migrates_a_new_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("app.db");

        let pool = connect(&path).await.unwrap();

        assert!(path.exists());
        let journal_mode: String = sqlx::query_scalar("PRAGMA journal_mode")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(journal_mode, "wal");
        let rows: i64 = sqlx::query_scalar("SELECT count(*) FROM settings")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(rows, 1);
    }

    #[tokio::test]
    async fn reopens_an_existing_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("app.db");
        connect(&path).await.unwrap().close().await;

        let pool = connect(&path).await.unwrap();

        let rows: i64 = sqlx::query_scalar("SELECT count(*) FROM settings")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(rows, 1);
    }
}
