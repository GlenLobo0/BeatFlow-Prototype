@echo off
setlocal EnableDelayedExpansion
title BeatFlow v0.5

:: ==========================================
:: BeatFlow v0.5
:: Drag a Beat Folder onto this BAT file
:: ==========================================

if "%~1"=="" (
    cls
    echo ==========================================
    echo             BeatFlow v0.5
    echo ==========================================
    echo.
    echo Drag your Beat Folder onto this file.
    echo.
    pause
    exit /b
)

set "FOLDER=%~1"

cls
echo ==========================================
echo             BeatFlow v0.5
echo ==========================================
echo.

echo Beat Folder:
echo %FOLDER%
echo.

:: ------------------------------------------
:: Find WAV
:: ------------------------------------------

set "WAV="

for %%F in ("%FOLDER%\*.wav") do (
    if defined WAV (
        echo ERROR: Multiple WAV files found.
        pause
        exit /b
    )
    set "WAV=%%F"
)

if not defined WAV (
    echo ERROR: No WAV file found.
    pause
    exit /b
)

echo ✓ WAV Found

:: ------------------------------------------
:: Find Thumbnail
:: ------------------------------------------

set "IMG="

for %%F in ("%FOLDER%\*.png") do if not defined IMG set "IMG=%%F"
for %%F in ("%FOLDER%\*.jpg") do if not defined IMG set "IMG=%%F"
for %%F in ("%FOLDER%\*.jpeg") do if not defined IMG set "IMG=%%F"

if not defined IMG (
    echo ERROR: No thumbnail found.
    pause
    exit /b
)

echo ✓ Thumbnail Found

:: ------------------------------------------
:: Output Name
:: ------------------------------------------

for %%F in ("%WAV%") do (
    set "OUTPUT=%FOLDER%\%%~nF.mp4"
)

echo ✓ Output Ready
echo.

:: ------------------------------------------
:: Read Audio Duration
:: ------------------------------------------

for /f %%A in ('
ffprobe -v error -show_entries format^=duration -of csv^=p^=0 "%WAV%"
') do (
    set "DURATION=%%A"
)

echo Audio Duration: %DURATION% seconds
echo.

echo Creating video...
echo.

:: ------------------------------------------
:: Create Video
:: ------------------------------------------

ffmpeg -y ^
-loop 1 ^
-framerate 2 ^
-t %DURATION% ^
-i "%IMG%" ^
-i "%WAV%" ^
-map 0:v ^
-map 1:a ^
-vf "scale=-2:1080,pad=1920:1080:(ow-iw)/2:0:black" ^
-c:v libx264 ^
-preset medium ^
-tune stillimage ^
-c:a aac ^
-b:a 320k ^
-pix_fmt yuv420p ^
-movflags +faststart ^
"%OUTPUT%"

if errorlevel 1 (
    echo.
    echo ==========================================
    echo ERROR: Video creation failed.
    echo ==========================================
    pause
    exit /b
)

echo.
echo ==========================================
echo ✓ Video Created Successfully!
echo ==========================================
echo.
echo Output:
echo %OUTPUT%
echo.
pause