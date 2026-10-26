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

#[cfg(target_os = "macos")]
fn read_clipboard_text() -> Option<String> {
    use std::process::Command;

    let output = Command::new("pbpaste")
        .arg("-Prefer")
        .arg("txt")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok()
}

#[cfg(target_os = "windows")]
fn read_clipboard_text() -> Option<String> {
    use std::ffi::c_void;
    use std::ptr;

    const CF_UNICODETEXT: u32 = 13;

    #[link(name = "user32")]
    extern "system" {
        fn IsClipboardFormatAvailable(format: u32) -> i32;
        fn OpenClipboard(owner: *mut c_void) -> i32;
        fn CloseClipboard() -> i32;
        fn GetClipboardData(format: u32) -> *mut c_void;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GlobalLock(memory: *mut c_void) -> *mut c_void;
        fn GlobalUnlock(memory: *mut c_void) -> i32;
        fn GlobalSize(memory: *mut c_void) -> usize;
    }

    struct ClipboardGuard;
    impl Drop for ClipboardGuard {
        fn drop(&mut self) {
            unsafe {
                CloseClipboard();
            }
        }
    }

    unsafe {
        if IsClipboardFormatAvailable(CF_UNICODETEXT) == 0 || OpenClipboard(ptr::null_mut()) == 0 {
            return None;
        }
        let _guard = ClipboardGuard;

        let handle = GetClipboardData(CF_UNICODETEXT);
        if handle.is_null() {
            return None;
        }
        let data = GlobalLock(handle) as *const u16;
        if data.is_null() {
            return None;
        }

        let capacity = GlobalSize(handle) / std::mem::size_of::<u16>();
        let values = std::slice::from_raw_parts(data, capacity);
        let length = values
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(capacity);
        let text = String::from_utf16(values.get(..length)?).ok();
        GlobalUnlock(handle);
        text
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn read_clipboard_text() -> Option<String> {
    None
}
