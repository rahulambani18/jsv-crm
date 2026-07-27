# JSV CRM — Excel stock sync agent

This is a small, separate program that runs on the PC (or shared
folder) where your stock Excel file lives. It watches that file, and
the moment it's saved — whether someone edits it by hand or another
system exports fresh numbers into it — it pushes the updated
quantities straight into the JSV CRM's **Inventory** module. No
manual "Import" click needed.

It is **not** part of the website — it's a background helper that
must stay running on a PC that can see the file (the same PC it lives
on, or any PC with the shared folder mapped), because a website can't
reach into a file on your local network on its own — something has to
sit next to the file and watch it.

## What you'll need

- The Excel (`.xlsx`) or CSV file, and a PC that can always see it
  (ideally left on during business hours).
- [Node.js](https://nodejs.org) installed on that PC (the free "LTS"
  installer — just click through it, no configuration needed).
- 10 minutes for one-time setup.

## Step 1 — Make sure your Inventory tables exist

If you haven't already, run `supabase/add_inventory_tables.sql` in
your Supabase SQL Editor — it creates the `stock` and
`stock_movements` tables this agent writes into. Safe to run even if
you're not sure whether it's already been done.

## Step 2 — Get your Supabase service role key

This is different from the key the website uses — it's more
powerful, so it never goes in the browser, only in this local script.

1. Go to your Supabase project → **Settings → API**.
2. Copy the **`service_role`** secret key (NOT the `anon` key).

## Step 3 — Set up your Excel file's columns

The agent looks for these columns by name (it's not fussy about exact
spelling, spacing, or capitalization):

| What it means | Accepted column headers |
|---|---|
| Product name | Product, Product Name, Item, Item Name, SKU |
| Warehouse / location | Warehouse, Location, Godown, Store, Branch |
| Current quantity | Qty, Quantity, Qty On Hand, Closing Stock, Current Stock, Stock |
| Unit (optional) | Unit, UOM |
| Reorder level (optional) | Reorder Level, Min Stock, Reorder Point |

Each row should be one product at one warehouse — the same shape as
the Inventory page in the CRM. A row is skipped if it's missing a
product name, warehouse, or quantity.

## Step 4 — Configure the agent

1. Copy this whole `excel-stock-sync-agent` folder onto the PC that
   can see the stock file.
2. Open a terminal/Command Prompt in this folder and run:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<the service_role key from Step 2>
   STOCK_FILE_PATH=C:\Stock\stock.xlsx
   ```
   `STOCK_FILE_PATH` is the full path to the file, e.g.
   `C:\Stock\stock.xlsx` for a local file, or
   `\\OFFICE-PC\Shared\stock.xlsx` / `Z:\Stock\stock.xlsx` for a
   shared/network drive.

## Step 5 — Test it once

```
npm run once
```

You should see something like:
```
JSV CRM Excel stock sync agent starting
  Watching:     C:\Stock\stock.xlsx
  Supabase:     https://xxxxx.supabase.co
  Poll backup:  every 30s
+ Amrud Chips 200g @ Main Warehouse: (new) -> 480 kg
+ Amrud Chips 200g @ Depot 2: (new) -> 120 kg
synced 2 change(s), 0 unchanged
```

Check the **Inventory** page in the CRM — the quantities should match
your Excel file. Now edit a quantity in the Excel file, save it, and
run `npm run once` again — it should pick up just that change.

## Step 6 — Run it continuously

```
npm start
```

This keeps running: it reacts within about a second of the file being
saved, and also double-checks every 30 seconds as a safety net (some
Windows shared/network drives don't reliably announce file changes,
so the timer catches anything the instant-detection misses). Leave
this terminal window open, or set it up to run automatically:

### Keep it running automatically (Windows)

Easiest option — Task Scheduler:
1. Open **Task Scheduler** → **Create Task**.
2. **General** tab: name it "JSV CRM Excel Stock Sync", check "Run
   whether user is logged on or not".
3. **Triggers** tab → New → **At startup** (or **At log on**).
4. **Actions** tab → New → Program/script: `node`, Arguments:
   `sync.js`, "Start in": the full path to this
   `excel-stock-sync-agent` folder.
5. Save. It'll now start automatically every time the PC boots, and
   keep watching the file in the background.

## What gets synced

For every product/warehouse row in the file, the agent compares the
quantity to what's already in the CRM. If it's different (or the
row is new), it updates the `stock` table's `qty_on_hand` — this is
what drives the "In Stock / Low Stock / Out of Stock" status and
totals on the Inventory page.

If `LOG_MOVEMENTS=true` (the default) and a quantity changed, it also
adds an entry to that product's movement history (visible via the
clock icon on the Inventory page) tagged `Excel Sync`, so you can
always tell which changes came from the file versus a manual entry —
the same traceability the CRM already keeps for manual stock-in/
stock-out entries.

Products or warehouses that only exist in the CRM (not in the file)
are left untouched — this agent only ever updates rows that appear in
the Excel file; it doesn't delete anything.

## How duplicates/conflicts are avoided

Each row is matched to an existing CRM stock record by **product name
+ warehouse name** (must match exactly, so keep spelling consistent
between the CRM and the Excel file). If a row's quantity in the file
hasn't changed since the last check, nothing is written — so it's
always safe to leave this running, restart it, or run it manually as
often as you like.
