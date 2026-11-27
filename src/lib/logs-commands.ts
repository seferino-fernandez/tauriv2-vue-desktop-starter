/** Typed wrapper for the command in `src-tauri/src/logs.rs` */
import { invoke } from "@tauri-apps/api/core";

/** Opens the folder the log files are in, in the system's file manager */
export function openLogFolder(): Promise<void> {
  return invoke("open_log_folder");
}
