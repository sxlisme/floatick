#[cfg(target_os = "macos")]
pub fn prepare_transparent_window(window: &tauri::WebviewWindow) {
    use objc2::{msg_send, runtime::AnyObject};
    use objc2_app_kit::{NSColor, NSView, NSWindow};
    use objc2_foundation::{ns_string, NSObjectNSKeyValueCoding, NSNumber};
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
