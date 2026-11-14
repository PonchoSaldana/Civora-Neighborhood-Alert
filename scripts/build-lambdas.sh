#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

FUNCS="presignUpload createIncident getIncidents getIncidentById updateStatus confirmIncident linkDuplicate processIncidentStep"

rm -rf build
for f in $FUNCS; do
  if [ ! -f "src/functions/$f.ts" ]; then
    echo "ERROR: falta src/functions/$f.ts" >&2
    exit 1
  fi
  npx --no-install esbuild "src/functions/$f.ts" \
    --bundle --platform=node --target=node22 --format=cjs --minify \
    --outfile="build/$f/index.js" --log-level=warning
done

echo "Listo. Tamaño de cada función:"
du -sh build/*
