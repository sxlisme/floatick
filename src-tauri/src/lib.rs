pub mod commands;
mod clipboard;
pub mod models;
mod panel;
mod platform;
pub mod storage;
pub mod tray;

use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Setup macOS Menu Bar System Tray
            tray::setup_tray(app.handle())?;
            clipboard::start_clipboard_watcher(app.handle().clone());

            // Blur / Click-outside handling & initial window position
            if let Some(window) = app.get_webview_window(tray::MAIN_WINDOW_LABEL) {
                platform::prepare_transparent_window(&window);
                let panel_scale = storage::load_settings()
                    .map(|s| s.panel_scale)
                    .unwrap_or(1.0);
                let _ = tray::resize_main_window(app.handle(), panel_scale);

                let is_autostart = std::env::args().any(|arg| arg == "--autostart");
                let initial_mode = storage::load_settings()
                    .map(|s| s.presentation_mode)
                    .unwrap_or_else(|_| "transient".to_string());
                if !is_autostart && initial_mode != "ballPersistent" {
                    let app_handle = app.handle().clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(120));
                        let h = app_handle.clone();
                        let _ = app_handle.run_on_main_thread(move || {
                            tray::show_window(&h);
                        });
                    });
                } else if initial_mode == "ballPersistent" {
                    tray::show_ball(app.handle());
                }

                let w_clone = window.clone();
                window.on_window_event(move |event| {
                    match event {
                        WindowEvent::Focused(focused) => {
                            panel::on_focus_changed(&w_clone, *focused);
                        }
                        WindowEvent::Moved(position) => {
                            tray::constrain_window_to_visible_area(&w_clone, Some(*position));
                        }
                        _ => {}
                    }
                });
            }

            if let Some(window) = app.get_webview_window(tray::BALL_WINDOW_LABEL) {
                platform::prepare_transparent_window(&window);

                let w_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Moved(position) = event {
                        tray::constrain_window_to_visible_area(&w_clone, Some(*position));
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_todos,
            commands::save_todos,
            commands::get_tags,
            commands::save_tags,
            commands::get_notes,
            commands::save_notes,
            commands::get_clipboard_items,
            commands::save_clipboard_items,
            commands::get_settings,
            commands::save_settings,
            commands::set_window_scale,
            commands::apply_presentation_mode,
            commands::show_main_window,
            commands::start_window_drag,
            commands::get_window_label,
            commands::hide_window,
            commands::toggle_window,
            commands::set_always_on_top,
            commands::is_autostart_enabled,
            commands::set_autostart_enabled,
            commands::update_tray_count,
            commands::quit_app,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Reopen { .. } = event {
                log::info!(target: "floatick::panel", "reopen");
                tray::show_window(app_handle);
            }
        });
}
