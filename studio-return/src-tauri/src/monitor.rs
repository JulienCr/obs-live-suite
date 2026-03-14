use serde::Serialize;
use std::collections::HashMap;
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

/// Get friendly monitor names via DisplayConfig API (maps GDI device path → real model name)
#[cfg(target_os = "windows")]
fn get_friendly_monitor_names() -> HashMap<String, String> {
    use windows::Win32::Devices::Display::{
        DisplayConfigGetDeviceInfo, GetDisplayConfigBufferSizes, QueryDisplayConfig,
        DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME, DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME,
        DISPLAYCONFIG_MODE_INFO, DISPLAYCONFIG_PATH_INFO, DISPLAYCONFIG_SOURCE_DEVICE_NAME,
        DISPLAYCONFIG_TARGET_DEVICE_NAME, QDC_ONLY_ACTIVE_PATHS,
    };
    use windows::Win32::Foundation::ERROR_SUCCESS;

    let mut names = HashMap::new();

    // Get buffer sizes
    let mut path_count: u32 = 0;
    let mut mode_count: u32 = 0;
    let ret = unsafe { GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, &mut path_count, &mut mode_count) };
    if ret != ERROR_SUCCESS {
        eprintln!("[StudioReturn][monitors] GetDisplayConfigBufferSizes failed: {:?}", ret);
        return names;
    }

    let mut paths = vec![DISPLAYCONFIG_PATH_INFO::default(); path_count as usize];
    let mut modes = vec![DISPLAYCONFIG_MODE_INFO::default(); mode_count as usize];

    let ret = unsafe {
        QueryDisplayConfig(
            QDC_ONLY_ACTIVE_PATHS,
            &mut path_count,
            paths.as_mut_ptr(),
            &mut mode_count,
            modes.as_mut_ptr(),
            None,
        )
    };
    if ret != ERROR_SUCCESS {
        eprintln!("[StudioReturn][monitors] QueryDisplayConfig failed: {:?}", ret);
        return names;
    }
    paths.truncate(path_count as usize);

    for path in &paths {
        // Get source name (GDI device path like \\.\DISPLAY1)
        let mut source_name = DISPLAYCONFIG_SOURCE_DEVICE_NAME::default();
        source_name.header.adapterId = path.sourceInfo.adapterId;
        source_name.header.id = path.sourceInfo.id;
        source_name.header.r#type = DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME;
        source_name.header.size = std::mem::size_of::<DISPLAYCONFIG_SOURCE_DEVICE_NAME>() as u32;

        if unsafe { DisplayConfigGetDeviceInfo(&mut source_name.header) } != 0 {
            continue;
        }

        let gdi_name = String::from_utf16_lossy(&source_name.viewGdiDeviceName)
            .trim_end_matches('\0')
            .to_string();

        // Get target name (friendly monitor name like "SAMSUNG Odyssey G9")
        let mut target_name = DISPLAYCONFIG_TARGET_DEVICE_NAME::default();
        target_name.header.adapterId = path.targetInfo.adapterId;
        target_name.header.id = path.targetInfo.id;
        target_name.header.r#type = DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME;
        target_name.header.size = std::mem::size_of::<DISPLAYCONFIG_TARGET_DEVICE_NAME>() as u32;

        if unsafe { DisplayConfigGetDeviceInfo(&mut target_name.header) } != 0 {
            continue;
        }

        let model = String::from_utf16_lossy(&target_name.monitorFriendlyDeviceName)
            .trim_end_matches('\0')
            .to_string();

        if !model.is_empty() {
            // Decode manufacturer from EDID PnP ID (3 letters packed in u16 big-endian)
            let mfr_id = target_name.edidManufactureId;
            // Swap bytes (EDID stores big-endian, Windows gives native)
            let raw = ((mfr_id & 0xFF) << 8) | ((mfr_id >> 8) & 0xFF);
            let c1 = (b'A' - 1 + ((raw >> 10) & 0x1F) as u8) as char;
            let c2 = (b'A' - 1 + ((raw >> 5) & 0x1F) as u8) as char;
            let c3 = (b'A' - 1 + (raw & 0x1F) as u8) as char;
            let pnp_id = format!("{}{}{}", c1, c2, c3);

            let manufacturer = match pnp_id.as_str() {
                "SAM" | "SEC" | "SEM" => "Samsung",
                "ACI" | "AUS" => "ASUS",
                "AOC" => "AOC",
                "DEL" => "Dell",
                "HWP" | "HPN" => "HP",
                "LEN" => "Lenovo",
                "GSM" | "LGD" => "LG",
                "BNQ" => "BenQ",
                "VSC" => "ViewSonic",
                "ACR" => "Acer",
                "PHL" => "Philips",
                "MSI" => "MSI",
                "IVM" => "Iiyama",
                "ENC" => "EIZO",
                "GBT" => "Gigabyte",
                _ => &pnp_id,
            };

            let friendly = format!("{} {}", manufacturer, model);
            eprintln!(
                "[StudioReturn][monitors] DisplayConfig: {} → \"{}\" (pnp={})",
                gdi_name, friendly, pnp_id
            );
            names.insert(gdi_name, friendly);
        }
    }

    names
}

#[cfg(not(target_os = "windows"))]
fn get_friendly_monitor_names() -> HashMap<String, String> {
    HashMap::new()
}

/// List all available monitors
pub fn list_monitors(app: &AppHandle) -> Vec<MonitorInfo> {
    let monitors_result = app.available_monitors();
    let monitors = match &monitors_result {
        Ok(m) => {
            eprintln!("[StudioReturn][monitors] available_monitors() returned {} monitor(s)", m.len());
            m.as_slice()
        }
        Err(e) => {
            eprintln!("[StudioReturn][monitors] available_monitors() ERROR: {}", e);
            return Vec::new();
        }
    };

    let primary = app.primary_monitor().ok().flatten();
    if let Some(ref p) = primary {
        let ps = p.size();
        eprintln!("[StudioReturn][monitors] primary_monitor: {}x{}", ps.width, ps.height);
    } else {
        eprintln!("[StudioReturn][monitors] primary_monitor: None");
    }

    // Get friendly names from Win32 API (maps "\\.\DISPLAY1" → "ASUS VG27AQ" etc.)
    let friendly_names = get_friendly_monitor_names();

    let result: Vec<MonitorInfo> = monitors
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let size = m.size();
            let pos = m.position();
            let device_path = m.name().cloned().unwrap_or_default();
            let name = friendly_names
                .get(&device_path)
                .cloned()
                .unwrap_or_else(|| {
                    if device_path.is_empty() {
                        format!("Monitor {}", i + 1)
                    } else {
                        device_path.clone()
                    }
                });
            let is_primary = primary
                .as_ref()
                .map(|p| p.position() == m.position() && p.size() == m.size())
                .unwrap_or(false);

            eprintln!(
                "[StudioReturn][monitors]   [{}] \"{}\" (device: {}) {}x{} at ({},{}) primary={}",
                i, name, device_path, size.width, size.height, pos.x, pos.y, is_primary
            );

            MonitorInfo {
                index: i,
                name,
                width: size.width,
                height: size.height,
                x: pos.x,
                y: pos.y,
                is_primary,
            }
        })
        .collect();

    result
}

/// Position the main window on the monitor at the given index.
/// If `known_monitors` is provided, uses cached data to avoid re-enumerating.
pub fn position_on_monitor(
    app: &AppHandle,
    monitor_index: usize,
    known_monitors: Option<&[MonitorInfo]>,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    if let Some(monitors) = known_monitors {
        let info = monitors
            .get(monitor_index)
            .ok_or_else(|| format!("Monitor index {} out of range ({})", monitor_index, monitors.len()))?;

        window
            .set_position(PhysicalPosition::new(info.x, info.y))
            .map_err(|e| e.to_string())?;
        window
            .set_size(PhysicalSize::new(info.width, info.height))
            .map_err(|e| e.to_string())?;
    } else {
        let monitors = app.available_monitors().map_err(|e| e.to_string())?;
        let monitor = monitors
            .get(monitor_index)
            .ok_or_else(|| format!("Monitor index {} out of range ({})", monitor_index, monitors.len()))?;

        let pos = monitor.position();
        let size = monitor.size();

        window
            .set_position(PhysicalPosition::new(pos.x, pos.y))
            .map_err(|e| e.to_string())?;
        window
            .set_size(PhysicalSize::new(size.width, size.height))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Report monitors to the backend API
pub async fn report_monitors_to_backend(client: &reqwest::Client, monitors: &[MonitorInfo], base_url: &str) {
    let url = format!("{}/api/settings/studio-return/monitors", base_url);
    eprintln!("[StudioReturn][monitors] POSTing {} monitor(s) to {}", monitors.len(), url);

    match client
        .post(&url)
        .json(&serde_json::json!({ "monitors": monitors }))
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status.is_success() {
                eprintln!("[StudioReturn][monitors] POST success: {}", body);
            } else {
                eprintln!("[StudioReturn][monitors] POST failed: HTTP {} — {}", status, body);
            }
        }
        Err(e) => {
            eprintln!("[StudioReturn][monitors] POST error: {}", e);
        }
    }
}
