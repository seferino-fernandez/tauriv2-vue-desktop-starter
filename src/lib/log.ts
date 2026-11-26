/**
 * Writes frontend errors to the app's log file. That only works in release builds: debug builds
 * give Rust's logger to CrabNebula DevTools and do not register the log plugin, so there errors
 * go to the webview console instead.
 */
import { error } from '@tauri-apps/plugin-log'

/** `message`, then what went wrong: an error's stack, or anything else as text */
export function describeError(message: string, cause?: unknown): string {
  if (cause === undefined)
    return message
  if (cause instanceof Error)
    return `${message}: ${cause.stack ?? cause.message}`
  if (typeof cause === 'string')
    return `${message}: ${cause}`
  try {
    return `${message}: ${JSON.stringify(cause)}`
  }
  catch {
    return `${message}: ${String(cause)}`
  }
}

/**
 * Logs an error, and never throws. Where the log plugin is missing (`just build`'s debug binary
 * with a production frontend), it goes to the console instead.
 */
export function logError(message: string, cause?: unknown) {
  if (import.meta.env.PROD)
    error(describeError(message, cause)).catch(() => console.error(message, cause))
  else
    console.error(message, cause)
}
