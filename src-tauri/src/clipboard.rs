use std::process::Command;
use std::thread;
use std::time::Duration;

use tauri::AppHandle;

pub fn start_clipboard_watcher(_app: AppHandle) {
    thread::spawn(move || {
        let mut last_seen = String::new();

        loop {
            if let Some(text) = read_clipboard_text() {
                let normalized = text.trim().to_string();
                if !normalized.is_empty() && normalized != last_seen {
                    last_seen = normalized.clone();
                    if let Err(error) = crate::storage::add_clipboard_text(normalized) {
                        log::warn!(target: "floatick::clipboard", "save clipboard text failed: {error}");
                    }
                }
            }
            thread::sleep(Duration::from_millis(1500));
        }
    });
}

fn read_clipboard_text() -> Option<String> {
    let output = Command::new("pbpaste").arg("-Prefer").arg("txt").output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok()
}
