# BeatFlow — macOS App

BeatFlow is a desktop application for music producers that combines a beat and its artwork into a YouTube-ready MP4 video.

## Features

- Generate MP4 videos from a beat folder containing an MP3 and artwork
- Render 1920 × 1080 video with H.264 and AAC
- Preview artwork before rendering
- Track rendering progress
- Open the output folder after rendering
- Switch between dark and beige themes
- Drag and drop to simplify the workflow

## Tech Stack

- Tauri
- React
- TypeScript
- Rust
- Vite
- FFmpeg

## Development

From this directory, install dependencies and start the development app:

    npm install
    npm run tauri dev

Build the macOS application with:

    npm run tauri build

Building requires the relevant macOS development prerequisites, Rust, and FFmpeg as required by the application.

## Input Requirements

The input folder must contain both the MP3 audio file and its artwork.
