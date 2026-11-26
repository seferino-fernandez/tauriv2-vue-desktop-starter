//! The crate's error type, and the shape the frontend receives it in.

use serde::ser::{Serialize, SerializeStruct as _, Serializer};

/// Everything that can go wrong in a command or while the app starts.
///
/// A command that fails rejects its `invoke` promise with `{ kind, message }`, where `kind` is
/// one of `"database"`, `"migrate"`, `"io"` or `"tauri"`.
#[derive(Debug, thiserror::Error)]
pub(crate) enum Error {
    /// A query failed, or the database could not be opened.
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    /// The schema could not be brought up to date.
    #[error(transparent)]
    Migrate(#[from] sqlx::migrate::MigrateError),
    /// A file or directory could not be read or created.
    #[error(transparent)]
    Io(#[from] std::io::Error),
    /// Tauri could not answer, e.g. it does not know the app data directory.
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl Error {
    /// The variant's name as the frontend sees it.
    fn kind(&self) -> &'static str {
        match self {
            Self::Database(_) => "database",
            Self::Migrate(_) => "migrate",
            Self::Io(_) => "io",
            Self::Tauri(_) => "tauri",
        }
    }
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut error = serializer.serialize_struct("Error", 2)?;
        error.serialize_field("kind", self.kind())?;
        error.serialize_field("message", &self.to_string())?;
        error.end()
    }
}

/// A `Result` whose error is this crate's [`Error`].
pub(crate) type Result<T, E = Error> = std::result::Result<T, E>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_as_kind_and_message() {
        let error = Error::from(std::io::Error::other("disk full"));
        let json = serde_json::to_value(&error).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "kind": "io", "message": "disk full" })
        );
    }
}
