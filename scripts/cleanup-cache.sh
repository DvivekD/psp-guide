#!/bin/bash
# PSP Cloud Streaming — Cache Cleanup Script
# Run via cron every 15 minutes: */15 * * * * /path/to/cleanup-cache.sh

# Kill zombie ffmpeg processes older than 10 minutes
for pid in $(pgrep -f ffmpeg); do
  elapsed=$(ps -o etimes= -p $pid 2>/dev/null | tr -d ' ')
  if [ -n "$elapsed" ] && [ "$elapsed" -gt 600 ]; then
    kill -9 $pid 2>/dev/null
    echo "[Cleanup] Killed zombie ffmpeg PID $pid (age: ${elapsed}s)"
  fi
done

# Kill zombie yt-dlp processes older than 5 minutes
for pid in $(pgrep -f yt-dlp); do
  elapsed=$(ps -o etimes= -p $pid 2>/dev/null | tr -d ' ')
  if [ -n "$elapsed" ] && [ "$elapsed" -gt 300 ]; then
    kill -9 $pid 2>/dev/null
    echo "[Cleanup] Killed zombie yt-dlp PID $pid (age: ${elapsed}s)"
  fi
done

# Clean thumbnail temp files older than 1 hour
find /tmp -name 'sc_thumb_*' -mmin +60 -delete 2>/dev/null

# Clean FLV cache files older than 2 hours
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
find "$SCRIPT_DIR/../server/cloudmedia/cache" -name '*.flv' -mmin +120 -delete 2>/dev/null
find "$SCRIPT_DIR/../server/spotiflac/cache" -name '*.flv' -mmin +120 -delete 2>/dev/null

echo "[Cleanup] Done at $(date)"
