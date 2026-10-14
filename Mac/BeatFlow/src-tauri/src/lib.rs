
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};

use tauri::{Emitter, Window};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(serde::Serialize)]
struct BeatProject {
    folder: String,
    audio: Option<String>,
    artwork: Option<String>,
    duration: Option<f64>,
}

#[derive(Clone, serde::Serialize)]
struct RenderProgress {
    percent: f64,
    time: f64,
}

#[tauri::command]
fn scan_beat_folder(folder: String) -> Result<BeatProject, String> {
    let path = Path::new(&folder);

    if !path.is_dir() {
        return Err("Selected path is not a folder.".to_string());
    }

    let entries = fs::read_dir(path)
        .map_err(|error| format!("Could not read folder: {}", error))?;

    let mut audio: Option<String> = None;
    let mut artwork: Option<String> = None;

    for entry in entries {
        let entry = entry
            .map_err(|error| format!("Could not read folder entry: {}", error))?;

        let entry_path = entry.path();

        if !entry_path.is_file() {
            continue;
        }

        let extension = entry_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "wav" => {
                if audio.is_some() {
                    return Err("Multiple WAV files found.".to_string());
                }

                audio = Some(entry_path.to_string_lossy().to_string());
            }

            "png" | "jpg" | "jpeg" => {
                if artwork.is_none() {
                    artwork = Some(entry_path.to_string_lossy().to_string());
                }
            }

            _ => {}
        }
    }

    if audio.is_none() {
        return Err("No WAV file found.".to_string());
    }

    let audio_path = audio.as_ref().unwrap();
    let duration_output = run_ffprobe(audio_path)?;
    let duration_text = String::from_utf8_lossy(&duration_output.stdout);

    let duration = duration_text
        .trim()
        .parse::<f64>()
        .map_err(|error| format!("Could not parse audio duration: {}", error))?;

    Ok(BeatProject {
        folder,
        audio,
        artwork,
        duration: Some(duration),
    })
}

// IMPORTANT:
// This command is asynchronous so the UI can remain responsive.
// FFmpeg itself runs on Tauri's blocking worker pool.
#[tauri::command]
async fn create_video(
    window: Window,
    folder: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_video_blocking(window, folder)
    })
    .await
    .map_err(|error| format!("Video rendering task failed: {}", error))?
}

fn create_video_blocking(
    window: Window,
    folder: String,
) -> Result<String, String> {
    let path = Path::new(&folder);

    if !path.is_dir() {
        return Err("Selected path is not a folder.".to_string());
    }

    let entries = fs::read_dir(path)
        .map_err(|error| format!("Could not read folder: {}", error))?;

    let mut audio: Option<String> = None;
    let mut artwork: Option<String> = None;

    for entry in entries {
        let entry = entry
            .map_err(|error| format!("Could not read folder entry: {}", error))?;

        let entry_path = entry.path();

        if !entry_path.is_file() {
            continue;
        }

        let extension = entry_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "wav" => {
                if audio.is_some() {
                    return Err("Multiple WAV files found.".to_string());
                }

                audio = Some(entry_path.to_string_lossy().to_string());
            }

            "png" | "jpg" | "jpeg" => {
                if artwork.is_none() {
                    artwork = Some(entry_path.to_string_lossy().to_string());
                }
            }

            _ => {}
        }
    }

    let audio = audio.ok_or("No WAV file found.".to_string())?;

    let artwork = artwork.ok_or(
        "No artwork found. Add a PNG, JPG, or JPEG to the beat folder."
            .to_string(),
    )?;

    let duration_output = run_ffprobe(&audio)?;
    let duration_text = String::from_utf8_lossy(&duration_output.stdout);

    let duration = duration_text
        .trim()
        .parse::<f64>()
        .map_err(|error| format!("Could not parse audio duration: {}", error))?;

    let duration_string = duration.to_string();

    let audio_path = Path::new(&audio);

    let stem = audio_path
        .file_stem()
        .and_then(|name| name.to_str())
        .ok_or("Could not determine output filename.".to_string())?;

    let output = path.join(format!("{}.mp4", stem));

    println!("==========================================");
    println!("BeatFlow: starting FFmpeg render");
    println!("==========================================");
    println!("Audio: {}", audio);
    println!("Artwork: {}", artwork);
    println!("Duration: {} seconds", duration);
    println!("Output: {}", output.display());
    println!();

    let ffmpeg = find_executable("ffmpeg")?;

    let mut child = Command::new(&ffmpeg)
        .args([
            "-y",
            "-loop",
            "1",
            "-framerate",
            "2",
            "-i",
            &artwork,
            "-i",
            &audio,
            "-map",
            "0:v",
            "-map",
            "1:a",
            "-vf",
            "scale=-2:1080,pad=1920:1080:(ow-iw)/2:0:black",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-tune",
            "stillimage",
            "-c:a",
            "aac",
            "-b:a",
            "320k",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-t",
            &duration_string,
            "-progress",
            "pipe:1",
            "-nostats",
            output.to_string_lossy().as_ref(),
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| format!("Could not start FFmpeg: {}", error))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("Could not read FFmpeg progress.".to_string())?;

    let reader = BufReader::new(stdout);

    for line in reader.lines() {
        let line = line
            .map_err(|error| format!("Could not read FFmpeg progress: {}", error))?;

        if let Some(value) = line.strip_prefix("out_time_ms=") {
            if let Ok(time_us) = value.parse::<f64>() {
                let current_time = time_us / 1_000_000.0;

                let percent = if duration > 0.0 {
                    ((current_time / duration) * 100.0)
                        .clamp(0.0, 100.0)
                } else {
                    0.0
                };

                let progress = RenderProgress {
                    percent,
                    time: current_time,
                };

                if let Err(error) = window.emit("render-progress", progress) {
                    eprintln!("Could not emit render progress: {}", error);
                }
            }
        }

        if line == "progress=end" {
            let progress = RenderProgress {
                percent: 100.0,
                time: duration,
            };

            if let Err(error) = window.emit("render-progress", progress) {
                eprintln!("Could not emit final render progress: {}", error);
            }
        }
    }

    let status = child
        .wait()
        .map_err(|error| format!("Could not wait for FFmpeg: {}", error))?;

    if !status.success() {
        return Err(format!(
            "FFmpeg failed with exit code: {:?}",
            status.code()
        ));
    }

    println!();
    println!("==========================================");
    println!("BeatFlow: video created successfully");
    println!("==========================================");

    Ok(output.to_string_lossy().to_string())
}

fn run_ffprobe(
    audio_path: &str,
) -> Result<std::process::Output, String> {
    let ffprobe = find_executable("ffprobe")?;

    Command::new(ffprobe)
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            audio_path,
        ])
        .output()
        .map_err(|error| format!("Could not run ffprobe: {}", error))
}

fn find_executable(name: &str) -> Result<String, String> {
    let candidates = if name == "ffmpeg" {
        vec![
            "/opt/homebrew/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "ffmpeg",
        ]
    } else {
        vec![
            "/opt/homebrew/bin/ffprobe",
            "/usr/local/bin/ffprobe",
            "ffprobe",
        ]
    };

    for candidate in candidates {
        if candidate.starts_with('/') {
            if Path::new(candidate).exists() {
                return Ok(candidate.to_string());
            }
        } else {
            return Ok(candidate.to_string());
        }
    }

    Err(format!(
        "{} was not found. Install FFmpeg or check your FFmpeg installation.",
        name
    ))
}

#[tauri::command]
fn open_output_folder(folder: String) -> Result<(), String> {
    let path = std::path::Path::new(&folder);

    if !path.is_dir() {
        return Err(format!("Output folder does not exist: {}", folder));
    }

    std::process::Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|error| format!("Could not open output folder: {}", error))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub
fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_beat_folder,
            create_video,
            open_output_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
