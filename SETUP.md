# LeadManager Setup

## 1. Install dependencies
```bash
cd /Users/marian/Desktop/level/marketing/leadmanager
npm install
```

## 2. Create PostgreSQL database
If you don't have PostgreSQL installed:
```bash
brew install postgresql@15
brew services start postgresql@15
createdb leadmanager
```

## 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set your PostgreSQL connection string:
```
DATABASE_URL="postgresql://marian@localhost:5432/leadmanager"
```
(on Mac with default Postgres install, username is your Mac username, no password)

## 4. Create database tables
```bash
npm run db:push
```

## 5. Import all CSV leads
```bash
npm run import
```
This reads all 5 scraper folders and imports into PostgreSQL.
Run again anytime to import newly scraped leads (skips duplicates).

## 6. Start the app
```bash
npm run dev
```
Open http://localhost:3000

---

## Daily workflow
1. Run `npm run import` after scrapers finish to load new leads
2. Open http://localhost:3000/leads to browse and filter
3. Click a lead → select a template → edit → copy email → log as sent
4. Update status as you work through leads

## Re-import after scraping
```bash
npm run import   # safe to run multiple times, skips existing leads
```
