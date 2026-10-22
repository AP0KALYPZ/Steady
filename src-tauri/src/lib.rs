use std::fs;

/// Files are only read after the user picks one in a native open dialog.
#[tauri::command]
fn file_size(path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    if !metadata.is_file() {
        return Err("That path is not a file.".to_string());
    }
    Ok(metadata.len())
}

/// Read the backup the user chose. Downloads and user documents only need a
/// normal user-level file read; no broad filesystem plugin is exposed.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    if !metadata.is_file() {
        return Err("That path is not a file.".to_string());
    }
    if metadata.len() > 10 * 1024 * 1024 {
        return Err("That file is larger than 10 MB.".to_string());
    }
    fs::read_to_string(&path).map_err(|error| error.to_string())
}

/// Write an export to the exact path the user approved in the save dialog.
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            file_size,
            read_text_file,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running STEADY");
}
