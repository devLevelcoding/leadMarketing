#!/bin/sh
# Copies the live database out of Docker into prisma/dev.db
# Run this before moving the project to another PC
docker compose cp app:/data/dev.db ./prisma/dev.db
echo "Done — prisma/dev.db is up to date. Copy the project folder to the other PC."
