#[cfg(target_os = "macos")]
pub fn prepare_transparent_window(window: &tauri::WebviewWindow) {
    use objc2::{msg_send, runtime::AnyObject};
    use objc2_app_kit::{NSColor, NSView, NSWindow};
    use objc2_foundation::{ns_string, NSNumber, NSObjectNSKeyValueCoding};
    use objc2_web_kit::WKWebView;

    if let Err(error) = window.set_background_color(None) {
        log::warn!(
            target: "floatick::panel",
            "clear background for {} failed: {error}",
            window.label()
        );
    }

    let label = window.label().to_string();
    let corner_radius = if label == crate::tray::BALL_WINDOW_LABEL {
        24.0
    } else {
        14.0
    };

    if let Ok(ns_view) = window.ns_view() {
        unsafe {
            let clear = NSColor::clearColor();
            let ns_view: &NSView = &*ns_view.cast();
            let _: () = msg_send![ns_view, setOpaque: false];
            let _: () = msg_send![ns_view, setBackgroundColor: &*clear];
            ns_view.setWantsLayer(true);

            let layer: *mut AnyObject = msg_send![ns_view, layer];
            if !layer.is_null() {
                let _: () = msg_send![layer, setCornerRadius: corner_radius];
                let _: () = msg_send![layer, setMasksToBounds: true];
            }
        }
    }

    if let Err(error) = window.with_webview(move |webview| unsafe {
        let clear = NSColor::clearColor();
        let ns_window: &NSWindow = &*webview.ns_window().cast();
        let wk_webview: &WKWebView = &*webview.inner().cast();

        ns_window.setOpaque(false);
        ns_window.setBackgroundColor(Some(&clear));

        let _: () = msg_send![wk_webview, setOpaque: false];
        let _: () = msg_send![wk_webview, setBackgroundColor: &*clear];
        wk_webview.setUnderPageBackgroundColor(Some(&clear));

        let no = NSNumber::numberWithBool(false);
        wk_webview.setValue_forKey(Some((&*no).as_ref()), ns_string!("drawsBackground"));

        if let Some(host_view) = wk_webview.superview() {
            host_view.setWantsLayer(true);
            let layer: *mut AnyObject = msg_send![&*host_view, layer];
            if !layer.is_null() {
                let _: () = msg_send![layer, setCornerRadius: corner_radius];
                let _: () = msg_send![layer, setMasksToBounds: true];
            }

            let host_view: &AnyObject = host_view.as_ref();
            let _: () = msg_send![host_view, setOpaque: false];
        }
    }) {
        log::warn!(
            target: "floatick::panel",
            "prepare native transparency for {label} failed: {error}"
        );
    }
}

#[cfg(target_os = "windows")]
pub fn replace_file(source: &std::path::Path, target: &std::path::Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;

    const MOVEFILE_REPLACE_EXISTING: u32 = 0x1;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x8;

    #[link(name = "kernel32")]
    extern "system" {
        fn MoveFileExW(
            existing_file_name: *const u16,
            new_file_name: *const u16,
            flags: u32,
        ) -> i32;
    }

    let source_wide: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let target_wide: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    let moved = unsafe {
        MoveFileExW(
            source_wide.as_ptr(),
            target_wide.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };

    if moved != 0 {
        Ok(())
    } else {
        Err(std::io::Error::last_os_error())
    }
}

#[cfg(not(target_os = "windows"))]
pub fn replace_file(source: &std::path::Path, target: &std::path::Path) -> std::io::Result<()> {
    std::fs::rename(source, target)
}

#[cfg(not(target_os = "macos"))]
pub fn prepare_transparent_window(window: &tauri::WebviewWindow) {
    if let Err(error) = window.set_background_color(None) {
        log::warn!(
            target: "floatick::panel",
            "clear background for {} failed: {error}",
            window.label()
        );
    }
}
