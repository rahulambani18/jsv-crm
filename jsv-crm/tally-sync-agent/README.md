# Tally → CRM sync agent

This is a small, separate program that runs on your Tally PC. It checks
Tally every minute for new Sales / Tax Invoice vouchers, and pushes any
new ones straight into the JSV CRM — no manual export/import needed.

It is **not** part of the website — it's a background helper that must
stay running on the same PC/network as Tally, because Tally has no way
to send data out on its own; something has to go ask it.

## What you'll need

- The PC that runs Tally, always on during business hours (you said this
  is already the case).
- [Node.js](https://nodejs.org) installed on that PC (the free "LTS"
  installer — just click through it, no configuration needed).
- 10 minutes for one-time setup.

## Step 1 — Enable Tally's XML server

1. Open Tally, go to the company you invoice from.
2. Press **F11** (Features) → **Connectivity**.
3. Set:
   - **Enable ODBC** → Yes
   - **Enable Tally.NET connectivity / HTTP** → Yes (wording varies by
     Tally version — look for anything mentioning "Client-Server" or
     "Port")
   - **Port** → leave as `9000` (default)
4. Save (Ctrl+A). Leave Tally open — the sync agent talks to Tally only
   while Tally itself is open with the company loaded.

If you don't see these exact options, search "Tally enable XML server
port 9000" for your specific Tally version (Prime / ERP 9) — the setting
has moved around between versions but every version has it.

## Step 2 — Get your Supabase service role key

This is different from the key the website uses — it's more powerful,
so it never goes in the browser, only in this local script.

1. Go to your Supabase project → **Settings → API**.
2. Copy the **`service_role`** secret key (NOT the `anon` key).

## Step 3 — Create the missing database tables (one-time)

If you haven't already, run `supabase/create_invoices_and_payments_tables.sql`
in your Supabase SQL Editor — it creates the `invoices` table this
script writes into. Safe to run even if you're not sure.

## Step 4 — Configure the agent

1. Copy this whole `tally-sync-agent` folder onto the Tally PC (or clone
   the repo there).
2. Open a terminal/Command Prompt in this folder and run:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<the service_role key from Step 2>
   TALLY_URL=http://localhost:9000
   TALLY_COMPANY=
   ```
   Leave `TALLY_COMPANY` blank unless Tally has multiple companies open
   at once — then put the exact company name as shown in Tally.

## Step 5 — Test it once

```
npm run once
```

You should see something like:
```
JSV CRM ⇄ Tally sync agent starting
  Tally server:  http://localhost:9000
  Supabase:      https://xxxxx.supabase.co
  Poll interval: 60s
checked 3 voucher(s), nothing new
```

If instead you see a connection error, double check Step 1 (Tally must
be open, with the company loaded, and the XML server enabled).

Create a test Sales/Tax Invoice voucher in Tally, save it, then run
`npm run once` again — it should print a line like:
```
+ synced invoice 1234 — Amrud Snack Limited — ₹79,650
```
Check the Invoices page in the CRM — the new invoice should be there.

## Step 6 — Run it continuously

```
npm start
```

This keeps running and checks Tally every 60 seconds automatically
(change `POLL_INTERVAL_SECONDS` in `.env` if you want it faster/slower).
Leave this terminal window open, or set it up to run automatically:

### Keep it running automatically (Windows)

Easiest option — Task Scheduler:
1. Open **Task Scheduler** → **Create Task**.
2. **General** tab: name it "JSV CRM Tally Sync", check "Run whether
   user is logged on or not".
3. **Triggers** tab → New → **At startup** (or **At log on**).
4. **Actions** tab → New → Program/script: `node`, Arguments: `sync.js`,
   "Start in": the full path to this `tally-sync-agent` folder.
5. Save. It'll now start automatically every time the PC boots, and
   keep polling in the background.

## How duplicates are avoided

Before inserting anything, the script checks whether an invoice with
that same invoice number already exists in the CRM. So it's always
safe to leave it running, restart it, or run it manually — it will
never create the same invoice twice.

## What gets synced

Only **Sales** and **Tax Invoice** vouchers, mapped to the CRM's
Invoices module: invoice number, customer name, date, subtotal,
CGST/SGST/IGST, total. They land with status "Unpaid" and are tagged
`source: Tally Sync` so you can tell them apart from invoices created
manually in the CRM.

Receipts/payments aren't auto-synced yet — you can still bring those in
manually via the "Import from Tally" button on the Payments page.
