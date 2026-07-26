![Windows](https://img.shields.io/badge/Platform-Windows-blue)
![Batch](https://img.shields.io/badge/Language-Batch-green)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Multimedia-red)
![Status](https://img.shields.io/badge/Status-Prototype-orange)

# 🎵 BeatFlow Prototype

### Automation for Music Producers

A prototype automation tool that converts a beat folder into a YouTube-ready MP4 using Windows Batch and FFmpeg.

---

## Overview

BeatFlow Prototype was created to remove my dependency on online video generation services such as TunesToTube.

Instead of manually uploading artwork and audio, this tool generates the final MP4 locally with a single drag-and-drop action.

This project serves as the first prototype for the future BeatFlow desktop application.

---

## Features

- Automatic WAV detection
- Automatic image detection (PNG/JPG/JPEG)
- Automatic output naming
- Automatic audio duration detection using ffprobe
- One-step drag-and-drop workflow
- Local MP4 generation
- YouTube-ready output

---

## Folder Structure

```
Beat Folder/
│
├── beat.flp
├── beat.wav
├── thumbnail.jpg
└── beat.mp4
```

Every beat remains completely self-contained.

---

## Workflow

1. Finish the beat.
2. Export the WAV.
3. Save the artwork in the same folder.
4. Drag the folder onto `make_video.bat`.
5. BeatFlow Prototype generates the MP4 automatically.

---

## Technologies

- Windows Batch
- FFmpeg
- ffprobe

---

## Lessons Learned

This prototype demonstrated that:

- Keeping every beat in its own folder greatly simplifies automation.
- Automatic file detection is more reliable than hardcoded filenames.
- Reading audio duration with ffprobe is more accurate than relying on `-shortest`.
- A simple prototype can significantly improve a real production workflow.

---

## Future Development

This repository is **not the final BeatFlow application**.

The long-term BeatFlow desktop application will be built in Python and will include:

- Modern desktop UI
- Drag-and-drop interface
- Artwork preview
- Live encoding progress
- Metadata generation
- BPM detection
- Musical key detection
- Upload assistance
- Batch processing

---

## Status

Prototype complete.

The knowledge gained from this project will be used to build the full BeatFlow desktop application.

## Note

This repository contains the initial prototype of BeatFlow.

The full BeatFlow application is planned as a Python desktop application with a graphical interface and significantly expanded functionality.

## License

This project is currently provided for educational and portfolio purposes.