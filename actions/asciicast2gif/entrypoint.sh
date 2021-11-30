#!/usr/bin/env bash

mkdir -p .asccicast

for filename in ${ASCCINEMA_GLOB_EXP}; do
  echo "=== PROCESSING: $filename ==="
  GIF_FILENAME=${filename/json/gif}
  NODE_TLS_REJECT_UNAUTHORIZED=0 /app/asciicast2gif -t ${ASCCINEMA_THEME} -s ${ASCCINEMA_SPEED} -S ${ASCCINEMA_SCALE} -w ${ASCCINEMA_COLUMNS} -h ${ASCCINEMA_ROWS} $filename .asciicast/${GIF_FILENAME}
  echo "=== FINISHED: ${GIF_FILENAME} ==="
done