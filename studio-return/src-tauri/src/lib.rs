mod monitor;

use monitor::{list_monitors, position_on_monitor, report_monitors_to_backend, MonitorInfo};
use serde::Deserialize;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_APP_PORT: u16 = 3000;
const SETTINGS_POLL_INTERVAL_SECS: u64 = 30;

fn get_backend_url() -> String {
    let port = std::env::var("APP_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(DEFAULT_APP_PORT);
    format!("http://127.0.0.1:{}", port)
}

/// Fetch settings from the backend using a shared client
async fn fetch_settings(client: &reqwest::Client, base_url: &str) -> Option<SettingsResponse> {
    let url = format!("{}/api/settings/studio-return", base_url);
    let resp = client.get(&url).send().await.ok()?;
    let data: SettingsResponse = resp.json().await.ok()?;
    Some(data)
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct StudioReturnSettings {
    monitor_index: Option<usize>,
    display_duration: Option<u64>,
    font_size: Option<u32>,
    enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsResponse {
    settings: Option<StudioReturnSettings>,
    ws_port: Option<u16>,
}

/// Apply settings to the window (monitor position, cursor events, send to frontend)
fn apply_settings(app: &tauri::AppHandle, settings: &StudioReturnSettings) {
    // Reposition window if monitor changed
    if let Some(idx) = settings.monitor_index {
        if let Err(e) = position_on_monitor(app, idx) {
            eprintln!("[StudioReturn] Failed to position on monitor {}: {}", idx, e);
        }
    }

    // Forward settings to the frontend via eval
    if let Some(window) = app.get_webview_window("main") {
        let js = format!(
            "window.__applySettings({})",
            serde_json::to_string(settings).unwrap_or_default()
        );
        let _ = window.eval(&js);
    }
}

/// Send the WebSocket port to the frontend
fn send_ws_port(app: &tauri::AppHandle, port: u16) {
    if let Some(window) = app.get_webview_window("main") {
        let js = format!("window.__setWsPort({})", port);
        let _ = window.eval(&js);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let debug_mode = std::env::args().any(|a| a == "--debug");

    tauri::Builder::default()
        .setup(move |app| {
            // Get primary monitor size for initial window dimensions
            let (width, height) = app
                .primary_monitor()
                .ok()
                .flatten()
                .map(|m| {
                    let s = m.size();
                    (s.width as f64, s.height as f64)
                })
                .unwrap_or((1920.0, 1080.0));

            // Create the window programmatically with transparency
            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::default(),
            )
            .title("Studio Return")
            .transparent(true)
            .decorations(false)
            .always_on_top(true)
            .resizable(false)
            .inner_size(width, height)
            .position(0.0, 0.0)
            .build()?;

            // Click-through by default
            let _ = window.set_ignore_cursor_events(true);

            // Enable debug overlay if --debug flag was passed
            if debug_mode {
                let _ = window.eval("window.__DEBUG__ = true;");
            }

            let handle = app.handle().clone();

            // Spawn async task for initial setup + periodic polling
            tauri::async_runtime::spawn(async move {
                let http_client = reqwest::Client::new();
                let backend_url = get_backend_url();

                // Report monitors to backend
                let monitors = list_monitors(&handle);
                report_monitors_to_backend(&http_client, &monitors, &backend_url).await;

                // Initial settings fetch & position on configured monitor
                if let Some(response) = fetch_settings(&http_client, &backend_url).await {
                    if let Some(settings) = &response.settings {
                        apply_settings(&handle, settings);
                    }
                    if let Some(port) = response.ws_port {
                        send_ws_port(&handle, port);
                    }
                } else {
                    // No backend yet — position on primary monitor
                    let _ = position_on_monitor(&handle, 0);
                }

                // Poll settings periodically
                let mut last_monitor_index: Option<usize> = None;
                let mut last_ws_port: Option<u16> = None;
                let mut last_monitors: Vec<MonitorInfo> = Vec::new();
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(SETTINGS_POLL_INTERVAL_SECS)).await;

                    // Re-report monitors only if changed
                    let monitors = list_monitors(&handle);
                    if monitors != last_monitors {
                        report_monitors_to_backend(&http_client, &monitors, &backend_url).await;
                        last_monitors = monitors;
                    }

                    // Fetch and apply settings
                    if let Some(response) = fetch_settings(&http_client, &backend_url).await {
                        if let Some(settings) = &response.settings {
                            let current_idx = settings.monitor_index;
                            if current_idx != last_monitor_index {
                                // Monitor changed — reposition window + forward all settings
                                apply_settings(&handle, settings);
                                last_monitor_index = current_idx;
                            } else {
                                // Forward non-monitor settings to frontend
                                if let Some(window) = handle.get_webview_window("main") {
                                    let js = format!(
                                        "window.__applySettings({})",
                                        serde_json::to_string(settings).unwrap_or_default()
                                    );
                                    let _ = window.eval(&js);
                                }
                            }
                        }
                        // Only send ws_port when it changes
                        if let Some(port) = response.ws_port {
                            if last_ws_port != Some(port) {
                                send_ws_port(&handle, port);
                                last_ws_port = Some(port);
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Studio Return");
}
