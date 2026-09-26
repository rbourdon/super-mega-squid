#!/usr/bin/env bash
# Transcodes the original WAV/MP3 sources in art/audio into compact web formats.
# Each sound is written as Ogg Vorbis (Chrome, Firefox, Edge) and MP3 (Safari);
# Phaser picks whichever the browser supports. Requires ffmpeg on PATH (or set
# FFMPEG=/path/to/ffmpeg). Outputs are committed, so this only needs re-running
# when the source audio changes.
set -euo pipefail
cd "$(dirname "$0")/.."
FFMPEG="${FFMPEG:-ffmpeg}"
SRC=art/audio
OUT=public/assets/audio
mkdir -p "$OUT"

encode() {
  local input="$1" name="$2" quality="$3" bitrate="$4"
  "$FFMPEG" -hide_banner -loglevel error -y -i "$SRC/$input" -map_metadata -1 -c:a libvorbis -q:a "$quality" "$OUT/$name.ogg"
  "$FFMPEG" -hide_banner -loglevel error -y -i "$SRC/$input" -map_metadata -1 -c:a libmp3lame -b:a "$bitrate" "$OUT/$name.mp3"
}

encode watersplash5.wav    splash          4 128k
encode playerhitland2.wav  land            4 128k
encode metalhit.wav        metal-hit       4 128k
encode splat.wav           splat           4 128k
encode spin4.wav           spin            4 128k
encode explosion2small.wav explosion-small 4 128k
encode explosion2.wav      explosion       4 128k
encode underwater2.wav     underwater      3 112k
encode wind.wav            wind            3 112k
encode themesong.mp3       theme           4 160k

ls -la "$OUT"
