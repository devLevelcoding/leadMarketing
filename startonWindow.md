# How to Start LeadMarketing on Windows

## Requirements

- [Node.js](https://nodejs.org/) installed (v18 or newer)
- Project folder on your PC with `prisma/dev.db` inside

---

## First Time Setup

Open a terminal inside the project folder (right-click → "Open in Terminal") and run:

```bash
npm install
```

Then generate the Prisma client:

```bash
npx prisma generate
```

---

## Start the App

```bash
npm run dev
```

Then open your browser at:

```
http://localhost:3000
```

---

## Stop the App

Press `Ctrl + C` in the terminal.

---

## Start Again (after stopping)

Just run:

```bash
npm run dev
```

No reinstall needed. Your database and all data are preserved in `prisma/dev.db`.

---

## Moving to Another PC

1. Copy the entire project folder to the new PC
2. Make sure `prisma/dev.db` is included (this is your database)
3. Run `npm install` once on the new PC
4. Run `npm run dev` and open `http://localhost:3000`

---

## Troubleshooting

**Port 3000 already in use:**
```bash
npx next dev -p 3001
```
Then open `http://localhost:3001`

**Database missing or empty:**
Make sure `prisma/dev.db` exists in the `prisma/` folder before starting.

**node_modules missing:**
```bash
npm install
```
