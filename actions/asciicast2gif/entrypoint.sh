#!/usr/bin/env bash

mkdir -p .asciicast

for filename in ${ASCIINEMA_GLOB_EXP}; do
  echo "=== PROCESSING: $filename ==="
  GIF_FILENAME=${filename/json/gif}
  NODE_TLS_REJECT_UNAUTHORIZED=0 /app/asciicast2gif -t ${ASCIINEMA_THEME} -s ${ASCIINEMA_SPEED} -S ${ASCIINEMA_SCALE} -w ${ASCIINEMA_COLUMNS} -h ${ASCIINEMA_ROWS} $filename .asciicast/${GIF_FILENAME}
  echo "=== FINISHED: ${GIF_FILENAME} ==="
done