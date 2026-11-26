//! Writes panics to the log, so a crash in a release build leaves a trace in the log file.

use std::backtrace::Backtrace;

/// Logs every panic, with where it happened and a backtrace, then runs the previous hook.
///
/// Call it first in [`crate::run`]. Release builds abort on a panic (`panic = "abort"`), but the
/// hook still runs before the process ends. Panics before the logging plugin is set up go nowhere.
pub(crate) fn install() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let message = info.payload_as_str().unwrap_or("a non-string payload");
        let location = info
            .location()
            .map_or_else(|| "an unknown location".to_owned(), ToString::to_string);
        log::error!(
            "panic at {location}: {message}\n{}",
            Backtrace::force_capture()
        );
        previous(info);
    }));
}
