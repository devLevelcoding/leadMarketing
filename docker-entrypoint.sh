#!/bin/sh
set -e
mkdir -p /data
# On first run copy the bundled DB (with all your leads data) into the volume
if [ ! -f /data/dev.db ]; then
  echo "First run: initialising database..."
  cp /app/prisma/dev.db /data/dev.db
fi
exec "$@"
