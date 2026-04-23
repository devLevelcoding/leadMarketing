#!/bin/sh
# Wipes the old volume and rebuilds with prisma/dev.db bundled inside
# Run this on a new PC (or to reset to the backed-up database)
docker compose down -v
docker compose up --build -d
echo "Done — app running at http://localhost:3000"
