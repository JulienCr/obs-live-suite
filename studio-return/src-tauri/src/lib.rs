mod monitor;

use monitor::{list_monitors, position_on_monitor, report_monitors_to_backend, MonitorInfo};
use serde::Deserialize;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_APP_PORT: u16 = 3000;
const SETTINGS_POLL_INTERVAL_SECS: u64 = 30;

fn get_backend_url() -> String {
    // Explicit APP_URL takes priority (e.g. "https://edison:3000")
    if let Ok(url) = std::env::var("APP_URL") {
        let url = url.trim_end_matches('/').to_string();
        eprintln!("[StudioReturn] Using APP_URL={}", url);
        return url;
    }

    let port = std::env::var("APP_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(DEFAULT_APP_PORT);
    let host = std::env::var("APP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

    // USE_HTTPS env var forces protocol
    if let Ok(val) = std::env::var("USE_HTTPS") {
        let protocol = if val == "true" { "https" } else { "http" };
        let url = format!("{}://{}:{}", protocol, host, port);
        eprintln!("[StudioReturn] Resolved backend_url={} (USE_HTTPS={})", url, val);
        return url;
    }

    // No explicit config — return empty, will be resolved by probe
    format!("PROBE://{}:{}", host, port)
}

/// Try HTTPS first, fallback to HTTP (like the WebSocket client does wss→ws)
async fn probe_backend_url(client: &reqwest::Client, candidate: &str) -> String {
    if !candidate.starts_with("PROBE://") {
        return candidate.to_string();
    }

    let host_port = candidate.trim_start_matches("PROBE://");

    // Try HTTPS first
    let https_url = format!("https://{}", host_port);
    eprintln!("[StudioReturn] Probing {}...", https_url);
    if let Ok(resp) = client
        .get(format!("{}/api/settings/studio-return", https_url))
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
    {
        if resp.status().is_success() {
            eprintln!("[StudioReturn] HTTPS probe success, using {}", https_url);
            return https_url;
        }
    }

    // Fallback to HTTP
    let http_url = format!("http://{}", host_port);
    eprintln!("[StudioReturn] HTTPS probe failed, falling back to {}", http_url);
    http_url
}

/// Fetch settings from the backend using a shared client
async fn fetch_settings(client: &reqwest::Client, base_url: &str) -> Option<SettingsResponse> {
    let url = format!("{}/api/settings/studio-return", base_url);
    let resp = client.get(&url).send().await.ok()?;
    let data: SettingsResponse = resp.json().await.ok()?;
    Some(data)
}

#[derive(Debug, Clone, Deserialize, serde::Serialize, PartialEq)]
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
/// If ws_port is provided, re-sends it after repositioning (window move can reset JS state)
fn apply_settings(
    app: &tauri::AppHandle,
    settings: &StudioReturnSettings,
    known_monitors: Option<&[MonitorInfo]>,
    ws_port: Option<u16>,
) {
    // Reposition window if monitor changed
    if let Some(idx) = settings.monitor_index {
        if let Err(e) = position_on_monitor(app, idx, known_monitors) {
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

        // Re-send WS port after window move (JS state may be lost)
        if let Some(port) = ws_port {
            let _ = window.eval(&format!("window.__setWsPort({})", port));
        }
    }
}

/// Send the WebSocket port to the frontend
fn send_ws_port(app: &tauri::AppHandle, port: u16) {
    if let Some(window) = app.get_webview_window("main") {
        let js = format!("window.__setWsPort({})", port);
        let _ = window.eval(&js);
    }
}

/// Tauri command: reposition window on a given monitor (called from JS via WebSocket push)
#[tauri::command]
fn reposition_monitor(app: tauri::AppHandle, monitor_index: usize) {
    eprintln!("[StudioReturn] reposition_monitor command: index={}", monitor_index);
    let monitors = list_monitors(&app);
    if let Err(e) = position_on_monitor(&app, monitor_index, Some(&monitors)) {
        eprintln!("[StudioReturn] reposition_monitor failed: {}", e);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let debug_mode = std::env::args().any(|a| a == "--debug") || cfg!(debug_assertions);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![reposition_monitor])
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
                // Accept self-signed certificates (mkcert dev certs)
                let http_client = reqwest::Client::builder()
                    .danger_accept_invalid_certs(true)
                    .build()
                    .unwrap_or_else(|_| reqwest::Client::new());
                let candidate = get_backend_url();
                let backend_url = probe_backend_url(&http_client, &candidate).await;
                eprintln!("[StudioReturn] Setup task started, backend_url={}", backend_url);

                // Report monitors to backend
                let monitors = list_monitors(&handle);
                eprintln!("[StudioReturn] Detected {} monitor(s), reporting to backend...", monitors.len());
                report_monitors_to_backend(&http_client, &monitors, &backend_url).await;

                // Initial settings fetch & position on configured monitor
                let mut current_ws_port: Option<u16> = None;
                if let Some(response) = fetch_settings(&http_client, &backend_url).await {
                    current_ws_port = response.ws_port;
                    if let Some(port) = current_ws_port {
                        send_ws_port(&handle, port);
                    }
                    if let Some(settings) = &response.settings {
                        apply_settings(&handle, settings, Some(&monitors), current_ws_port);
                    }
                } else {
                    // No backend yet — position on primary monitor
                    let _ = position_on_monitor(&handle, 0, Some(&monitors));
                }

                // Poll settings periodically
                let mut last_settings: Option<StudioReturnSettings> = None;
                let mut last_monitors: Vec<MonitorInfo> = Vec::new();
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(SETTINGS_POLL_INTERVAL_SECS)).await;

                    // Re-report monitors only if changed
                    let monitors = list_monitors(&handle);
                    if monitors != last_monitors {
                        report_monitors_to_backend(&http_client, &monitors, &backend_url).await;
                        last_monitors = monitors;
                    }

                    // Fetch and apply settings only if changed
                    if let Some(response) = fetch_settings(&http_client, &backend_url).await {
                        // Update ws_port if changed
                        if let Some(port) = response.ws_port {
                            if current_ws_port != Some(port) {
                                send_ws_port(&handle, port);
                                current_ws_port = Some(port);
                            }
                        }
                        if let Some(settings) = &response.settings {
                            if last_settings.as_ref() != Some(settings) {
                                apply_settings(&handle, settings, Some(&last_monitors), current_ws_port);
                                last_settings = Some(settings.clone());
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
