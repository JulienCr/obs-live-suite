use serde::Serialize;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    #[serde(rename = "isPrimary")]
    pub is_primary: bool,
}

/// List all available monitors
pub fn list_monitors(app: &AppHandle) -> Vec<MonitorInfo> {
    let monitors = app.available_monitors().unwrap_or_default();
    let primary = app.primary_monitor().ok().flatten();

    monitors
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let size = m.size();
            let pos = m.position();
            let is_primary = primary
                .as_ref()
                .map(|p| p.position() == m.position() && p.size() == m.size())
                .unwrap_or(false);

            MonitorInfo {
                index: i,
                name: m.name().cloned().unwrap_or_else(|| format!("Monitor {}", i + 1)),
                width: size.width,
                height: size.height,
                x: pos.x,
                y: pos.y,
                is_primary,
            }
        })
        .collect()
}

/// Position the main window on the monitor at the given index
pub fn position_on_monitor(app: &AppHandle, monitor_index: usize) -> Result<(), String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    let monitor = monitors
        .get(monitor_index)
        .ok_or_else(|| format!("Monitor index {} out of range ({})", monitor_index, monitors.len()))?;

    let pos = monitor.position();
    let size = monitor.size();

    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    window
        .set_position(PhysicalPosition::new(pos.x, pos.y))
        .map_err(|e| e.to_string())?;

    window
        .set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Report monitors to the backend API
pub async fn report_monitors_to_backend(client: &reqwest::Client, monitors: &[MonitorInfo], base_url: &str) {
    let url = format!("{}/api/settings/studio-return/monitors", base_url);

    match client
        .post(&url)
        .json(&serde_json::json!({ "monitors": monitors }))
        .send()
        .await
    {
        Ok(resp) => {
            if !resp.status().is_success() {
                eprintln!("[StudioReturn] Failed to report monitors: HTTP {}", resp.status());
            }
        }
        Err(e) => {
            eprintln!("[StudioReturn] Failed to report monitors: {}", e);
        }
    }
}
