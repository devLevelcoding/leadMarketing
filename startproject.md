# Start Project — From Zero to Running in Browser

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git (to clone the repo) or the project folder copied to this PC

---

## Step 1 — Get the project

Clone or copy the project folder to your PC. You should have a folder named `leadmanager` with all files inside.

---

## Step 2 — Get the database

You need `prisma/dev.db` inside the project folder. This file holds all leads, warmup plans, and history.

**Option A — You have a backup from another PC:**
Copy the `prisma/dev.db` file into the `prisma/` folder of this project, then run:
```sh
./db-restore.sh
```

**Option B — The other PC is still running:**
Run this on the **other PC** first:
```sh
./db-backup.sh
```
Then copy the whole project folder to this PC and run:
```sh
./db-restore.sh
```

**Option C — Fresh start (empty database):**
Skip this step. A blank database will be created automatically on first run.

---

## Step 3 — Build and start with Docker

Open a terminal inside the project folder and run:

```sh
docker compose up --build -d
```

This will:
1. Build the Docker image (bundles the app + database)
2. Start the container in the background
3. On first run, copy `prisma/dev.db` into the Docker volume

> First build takes 2–5 minutes. Subsequent starts are instant.

---

## Step 4 — Open in browser

```
http://localhost:3000
```

---

## Stop / Start (after first build)

```sh
# Stop
docker compose down

# Start again (no rebuild needed)
docker compose up -d
```

---

## Backup database before moving to another PC

**On the current PC** (save live data):
```sh
./db-backup.sh
```

**On the new PC** (load that data and start):
```sh
./db-restore.sh
```

---

## Reset everything (wipe data, start fresh)

```sh
docker compose down -v
docker compose up --build -d
```

> `-v` removes the database volume. All data will be lost.

---

## Troubleshooting

**Port 3000 already in use:**
Change the port in `docker-compose.yml` from `"3000:3000"` to e.g. `"3001:3000"`, then open `http://localhost:3001`.

**App starts but database is empty:**
Make sure `prisma/dev.db` exists before running `docker compose up --build -d`. If the volume already existed from a previous run, reset it first with `docker compose down -v`.

**Docker not found:**
Install Docker Desktop and make sure it is running (check the system tray icon).
