mod monitor;

use monitor::{list_monitors, position_on_monitor, report_monitors_to_backend, MonitorInfo};
use serde::Deserialize;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_APP_PORT: u16 = 3000;
const SETTINGS_POLL_INTERVAL_SECS: u64 = 30;

// ---- Config file support ----

/// Configuration loaded from `config.json` next to the executable.
#[derive(Debug, Deserialize, Default)]
struct Config {
    /// Full URL (e.g. "https://edison:3000") — overrides host/port/use_https
    url: Option<String>,
    /// Hostname (default: "127.0.0.1")
    host: Option<String>,
    /// Port (default: 3000)
    port: Option<u16>,
    /// Force HTTPS if true
    use_https: Option<bool>,
}

/// Load `config.json` from next to the executable, or from the current working directory.
fn load_config() -> Config {
    let candidates = [
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("config.json"))),
        std::env::current_dir()
            .ok()
            .map(|d| d.join("config.json")),
    ];

    for candidate in candidates.iter().flatten() {
        if candidate.exists() {
            match std::fs::read_to_string(candidate) {
                Ok(contents) => match serde_json::from_str::<Config>(&contents) {
                    Ok(config) => {
                        eprintln!("[StudioReturn] Loaded config from {}", candidate.display());
                        return config;
                    }
                    Err(e) => {
                        eprintln!(
                            "[StudioReturn] Warning: failed to parse {}: {}",
                            candidate.display(),
                            e
                        );
                    }
                },
                Err(e) => {
                    eprintln!(
                        "[StudioReturn] Warning: failed to read {}: {}",
                        candidate.display(),
                        e
                    );
                }
            }
        }
    }

    Config::default()
}

fn get_backend_url() -> String {
    let config = load_config();

    // 1. Config file `url` field takes highest priority
    if let Some(url) = config.url {
        let url = url.trim_end_matches('/').to_string();
        eprintln!("[StudioReturn] Using config file url={}", url);
        return url;
    }

    // 2. Explicit APP_URL env var
    if let Ok(url) = std::env::var("APP_URL") {
        let url = url.trim_end_matches('/').to_string();
        eprintln!("[StudioReturn] Using APP_URL={}", url);
        return url;
    }

    // 3. Build from individual fields (config file fields override env vars)
    let port = config.port.unwrap_or_else(|| {
        std::env::var("APP_PORT")
            .ok()
            .and_then(|s| s.parse::<u16>().ok())
            .unwrap_or(DEFAULT_APP_PORT)
    });
    let host = config
        .host
        .unwrap_or_else(|| std::env::var("APP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()));

    // 4. Protocol from config file or USE_HTTPS env var
    let use_https = config.use_https.or_else(|| {
        std::env::var("USE_HTTPS")
            .ok()
            .map(|v| v == "true")
    });

    if let Some(https) = use_https {
        let protocol = if https { "https" } else { "http" };
        let url = format!("{}://{}:{}", protocol, host, port);
        eprintln!("[StudioReturn] Resolved backend_url={}", url);
        return url;
    }

    // No explicit protocol — return probe marker for HTTPS/HTTP auto-detection
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
    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[StudioReturn] Settings fetch error: {}", e);
            return None;
        }
    };
    if !resp.status().is_success() {
        eprintln!("[StudioReturn] Settings fetch failed: HTTP {}", resp.status());
        return None;
    }
    match resp.json::<SettingsResponse>().await {
        Ok(data) => Some(data),
        Err(e) => {
            eprintln!("[StudioReturn] Settings JSON parse error: {}", e);
            None
        }
    }
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
    #[allow(dead_code)]
    ws_port: Option<u16>,
}

/// Apply settings to the window (monitor position, cursor events, send to frontend)
fn apply_settings(
    app: &tauri::AppHandle,
    settings: &StudioReturnSettings,
    known_monitors: Option<&[MonitorInfo]>,
) {
    // Reposition window if monitor changed
    if let Some(idx) = settings.monitor_index {
        if let Err(e) = position_on_monitor(app, idx, known_monitors) {
            eprintln!("[StudioReturn] Failed to position on monitor {}: {}", idx, e);
        }
    }

    // Forward settings to the Next.js overlay via eval
    if let Some(window) = app.get_webview_window("main") {
        let settings_json = match serde_json::to_string(settings) {
            Ok(json) => json,
            Err(e) => {
                eprintln!("[StudioReturn] Failed to serialize settings: {}", e);
                return;
            }
        };
        let js = format!(
            "if (window.__applySettings) window.__applySettings({})",
            settings_json
        );
        if let Err(e) = window.eval(&js) {
            eprintln!("[StudioReturn] Failed to eval settings in webview: {}", e);
        }
    }
}

/// Send the overlay URL to the bootstrapper frontend so it navigates to the Next.js page
fn send_overlay_url(app: &tauri::AppHandle, url: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let js = format!(
            "if (window.__setOverlayUrl) window.__setOverlayUrl('{}')",
            url
        );
        eprintln!("[StudioReturn] Sending overlay URL to frontend: {}", url);
        if let Err(e) = window.eval(&js) {
            eprintln!("[StudioReturn] Failed to send overlay URL to webview: {}", e);
        }
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
            if let Err(e) = window.set_ignore_cursor_events(true) {
                eprintln!("[StudioReturn] CRITICAL: Failed to set click-through mode: {}", e);
            }

            // Enable debug overlay if --debug flag was passed
            if debug_mode {
                if let Err(e) = window.eval("window.__DEBUG__ = true;") {
                    eprintln!("[StudioReturn] Failed to set debug flag: {}", e);
                }
            }

            let handle = app.handle().clone();

            // Spawn async task for initial setup + periodic polling
            tauri::async_runtime::spawn(async move {
                // Accept self-signed certificates only when using mkcert dev certs
                // (HTTPS probe or explicit USE_HTTPS). In production with real certs,
                // set STUDIO_RETURN_STRICT_TLS=true to enforce certificate validation.
                let accept_invalid_certs = std::env::var("STUDIO_RETURN_STRICT_TLS")
                    .map(|v| v != "true")
                    .unwrap_or(true);
                let http_client = reqwest::Client::builder()
                    .danger_accept_invalid_certs(accept_invalid_certs)
                    .build()
                    .unwrap_or_else(|_| reqwest::Client::new());
                let candidate = get_backend_url();
                let backend_url = probe_backend_url(&http_client, &candidate).await;
                eprintln!("[StudioReturn] Setup task started, backend_url={}", backend_url);

                // Report monitors to backend
                let monitors = list_monitors(&handle);
                eprintln!("[StudioReturn] Detected {} monitor(s), reporting to backend...", monitors.len());
                report_monitors_to_backend(&http_client, &monitors, &backend_url).await;

                // Send the overlay URL to the bootstrapper so it navigates to the Next.js page
                let overlay_url = format!("{}/overlays/studio-return", backend_url);
                send_overlay_url(&handle, &overlay_url);

                // Initial settings fetch & position on configured monitor
                if let Some(response) = fetch_settings(&http_client, &backend_url).await {
                    if let Some(settings) = &response.settings {
                        apply_settings(&handle, settings, Some(&monitors));
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
                        if let Some(settings) = &response.settings {
                            if last_settings.as_ref() != Some(settings) {
                                apply_settings(&handle, settings, Some(&last_monitors));
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
