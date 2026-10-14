#!/bin/bash

# ==========================================
# BeatFlow v0.5 — macOS Engine
# ==========================================

set -u

echo "=========================================="
echo "            BeatFlow v0.5 — Mac"
echo "=========================================="
echo

# ------------------------------------------
# Check folder argument
# ------------------------------------------

if [ "$#" -eq 0 ]; then
    echo "ERROR: No Beat Folder provided."
    echo
    echo "Drag a Beat Folder onto BeatFlow.command."
    echo
    read -r -p "Press Enter to exit..."
    exit 1
fi

FOLDER="$1"

echo "Beat Folder:"
echo "$FOLDER"
echo

# ------------------------------------------
# Check folder exists
# ------------------------------------------

if [ ! -d "$FOLDER" ]; then
    echo "ERROR: Beat Folder does not exist."
    echo
    read -r -p "Press Enter to exit..."
    exit 1
fi

# ------------------------------------------
# Find WAV
# ------------------------------------------

WAV_FILES=("$FOLDER"/*.wav)

if [ ! -e "${WAV_FILES[0]}" ]; then
    echo "ERROR: No WAV file found."
    echo
    read -r -p "Press Enter to exit..."
    exit 1
fi

if [ "${#WAV_FILES[@]}" -gt 1 ]; then
    echo "ERROR: Multiple WAV files found."
    echo
    read -r -p "Press Enter to exit..."
    exit 1
fi

WAV="${WAV_FILES[0]}"

echo "✓ WAV Found"
echo

# ------------------------------------------
# Find Thumbnail
# ------------------------------------------

IMG=""

for EXT in png jpg jpeg; do
    FILES=("$FOLDER"/*."$EXT")

    if [ -e "${FILES[0]}" ]; then
        IMG="${FILES[0]}"
        break
    fi
done

if [ -z "$IMG" ]; then
    echo "ERROR: No thumbnail found."
    echo
    read -r -p "Press Enter to exit..."
    exit 1
fi

echo "✓ Thumbnail Found"
echo

# ------------------------------------------
# Output Name
# ------------------------------------------

BASENAME="$(basename "$WAV")"
BASENAME="${BASENAME%.*}"

OUTPUT="$FOLDER/$BASENAME.mp4"

echo "✓ Output Ready"
echo

# ------------------------------------------
# Read Audio Duration
# ------------------------------------------

DURATION=$(ffprobe \
    -v error \
    -show_entries format=duration \
    -of csv=p=0 \
    "$WAV")

if [ -z "$DURATION" ]; then
    echo "ERROR: Could not read audio duration."
    echo
    read -r -p "Press Enter to exit..."
    exit 1
fi

echo "Audio Duration: $DURATION seconds"
echo

# ------------------------------------------
# Create Video
# ------------------------------------------

echo "Creating video..."
echo

ffmpeg -y \
    -loop 1 \
    -framerate 2 \
    -t "$DURATION" \
    -i "$IMG" \
    -i "$WAV" \
    -map 0:v \
    -map 1:a \
    -vf "scale=-2:1080,pad=1920:1080:(ow-iw)/2:0:black" \
    -c:v libx264 \
    -preset medium \
    -tune stillimage \
    -c:a aac \
    -b:a 320k \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "$OUTPUT"

if [ "$?" -ne 0 ]; then
    echo
    echo "=========================================="
    echo "ERROR: Video creation failed."
    echo "=========================================="
    echo
    read -r -p "Press Enter to exit..."
    exit 1
fi

echo
echo "=========================================="
echo "✓ Video Created Successfully!"
echo "=========================================="
echo
echo "Output:"
echo "$OUTPUT"
echo

read -r -p "Press Enter to exit..."
