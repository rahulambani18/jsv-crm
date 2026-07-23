# JSV CRM ⇄ Tally sync agent (two-way)

This is a small, separate program that runs on your Tally PC. It:

- checks Tally every minute for new Sales / Tax Invoice vouchers, and
  pushes any new ones straight into the JSV CRM (Tally → CRM), and
- checks the CRM for invoices reps created manually that haven't been
  sent to Tally yet, and pushes those into Tally (CRM → Tally).

No manual export/import needed either direction — that's what makes
this "two-way." (There's also a manual fallback for the CRM → Tally
direction if you'd rather not run this agent: the **Export to Tally**
button on the Invoices page downloads an importable XML file you bring
into Tally yourself via Gateway of Tally → Import Data. See "Manual
export, without the agent" near the bottom.)

It is **not** part of the website — it's a background helper that must
stay running on the same PC/network as Tally, because Tally has no way
to send data out on its own, or accept a connection from a browser
that isn't on the same network — something has to sit next to Tally
and talk to it directly in both directions.

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

Also run `supabase/add_tally_export_tracking_column.sql` — it adds the
`tally_synced_at` column this agent (and the in-app Export to Tally
button) use to track which invoices have already been sent to Tally,
so nothing gets pushed twice.

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

   For the CRM → Tally push direction, also set the ledger names Tally
   should book each invoice against — these must match your Tally
   company's chart of accounts exactly:
   ```
   PUSH_TO_TALLY=true
   TALLY_SALES_LEDGER=Sales
   TALLY_CGST_LEDGER=CGST
   TALLY_SGST_LEDGER=SGST
   TALLY_IGST_LEDGER=IGST
   ```
   If you don't want the push direction yet, set `PUSH_TO_TALLY=false`
   and this agent behaves exactly like the old pull-only version.

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

To test the other direction, create an invoice manually in the CRM
(Invoices → New Invoice), then run `npm run once` again — you should
see:
```
+ pushed invoice INV-2026-0042 — Amrud Snack Limited — ₹45,200 to Tally
```
Open Tally and check the Day Book — the voucher should be there. If it
instead logs a "could not push invoice ..." error, it's almost always
a ledger name mismatch — double check `TALLY_SALES_LEDGER` /
`TALLY_CGST_LEDGER` / `TALLY_SGST_LEDGER` / `TALLY_IGST_LEDGER` in
`.env` match your Tally chart of accounts exactly.

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

**Tally → CRM:** before inserting anything, the script checks whether
an invoice with that same invoice number already exists in the CRM.

**CRM → Tally:** the script only ever looks at invoices where
`tally_synced_at` is still empty, and sets it the moment a push
succeeds. An invoice that failed to push (e.g. a ledger name mismatch)
is left unmarked so it's retried on the next poll — but nothing that
already succeeded is ever sent twice.

Either way, it's always safe to leave this running, restart it, or run
it manually.

## What gets synced

**Tally → CRM** (pull): only **Sales** and **Tax Invoice** vouchers,
mapped to the CRM's Invoices module: invoice number, customer name,
date, subtotal, CGST/SGST/IGST, total. They land with status "Unpaid"
and are tagged `source: Tally Sync` so you can tell them apart from
invoices created manually in the CRM.

**CRM → Tally** (push): any invoice created manually in the CRM
(`source` is empty or `Manual`) that hasn't been pushed yet, as a
Sales voucher with the same fields in reverse — invoice number,
customer name, date, and the tax breakdown split across the ledger
names configured in `.env`. Invoices that already came *from* Tally
(`source: Tally Sync` or `Tally Import`) are never pushed back, so
nothing ping-pongs between the two systems.

Receipts/payments aren't auto-synced yet — you can still bring those in
manually via the "Import from Tally" button on the Payments page.

## Manual export, without the agent

If you'd rather not run this agent at all, the Invoices page in the
CRM has its own **Export to Tally** button that does the CRM → Tally
half on its own: it downloads a `.xml` file for the invoices you pick,
which you then bring into Tally yourself via **Gateway of Tally →
Import Data → Vouchers**. It uses the same ledger-name rules described
above (configured in the export dialog instead of `.env`), and marks
exported invoices the same way (`tally_synced_at`), so the two paths
never conflict — an invoice exported manually won't also get pushed
by this agent, and vice versa.
