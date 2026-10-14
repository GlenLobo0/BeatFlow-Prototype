#!/bin/bash

# ==========================================
# BeatFlow v0.5 — macOS Launcher
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE="$SCRIPT_DIR/make_video.sh"

echo "=========================================="
echo "            BeatFlow v0.5 — Mac"
echo "=========================================="
echo

# ------------------------------------------
# Function: Clean pasted path
# ------------------------------------------

clean_path() {
    local PATH_INPUT="$1"

    # Remove surrounding quotes
    PATH_INPUT="${PATH_INPUT#\"}"
    PATH_INPUT="${PATH_INPUT%\"}"

    # Convert escaped spaces to normal spaces
    PATH_INPUT="${PATH_INPUT//\\ / }"

    # Convert escaped backslashes
    PATH_INPUT="${PATH_INPUT//\\\\/\\}"

    echo "$PATH_INPUT"
}

# ------------------------------------------
# Check for dragged folder
# ------------------------------------------

FOLDER=""

if [ "$#" -gt 0 ]; then
    FOLDER="$(clean_path "$1")"

    if [ -d "$FOLDER" ]; then
        echo "Beat Folder detected:"
        echo "$FOLDER"
        echo
    else
        echo "ERROR: The dragged item is not a valid folder."
        echo
        FOLDER=""
    fi
fi

# ------------------------------------------
# Ask for folder if none was provided
# ------------------------------------------

while [ -z "$FOLDER" ]; do

    echo "No Beat Folder detected."
    echo
    echo "Enter the path to your Beat Folder"
    echo "or type q to exit."
    echo
    read -r -p "> " INPUT

    # Exit
    if [ "$INPUT" = "q" ] || [ "$INPUT" = "Q" ]; then
        echo
        echo "BeatFlow closed."
        exit 0
    fi

    FOLDER="$(clean_path "$INPUT")"

    # Check folder
    if [ ! -d "$FOLDER" ]; then
        echo
        echo "ERROR: Folder not found."
        echo "Please enter a valid Beat Folder path."
        echo
        FOLDER=""
    fi

done

# ------------------------------------------
# Run BeatFlow engine
# ------------------------------------------

echo
"$ENGINE" "$FOLDER"

# ------------------------------------------
# Exit
# ------------------------------------------

echo
echo "=========================================="
echo "BeatFlow finished."
echo "=========================================="
echo
read -r -p "Press Enter to close..."
