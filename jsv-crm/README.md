# JSV CRM — Food Additives & Chemicals

A complete sales CRM built for B2B chemical / food-additive distribution:
lead → sample → quotation → order, with follow-up tracking, a customer
master, a product catalogue, and a reports dashboard.

This is a **real, working React app** — it runs entirely on demo data out
of the box (no setup needed), and is wired to switch to a live Supabase
database with two environment variables when you're ready.

## Modules

- **Dashboard** — pipeline stats, lead-source breakdown, pipeline-by-stage funnel
- **Leads** — lead list with priority, pipeline stage, est. value, next follow-up
- **Follow-ups** — Today / Upcoming / Overdue / Completed / All views
- **Customers** — converted accounts with GST, industry, application, products
- **Samples** — sample dispatch tracking with courier tracking numbers
- **Quotations** — quote list with totals and validity
- **Orders** — orders by warehouse, delivery, payment status
- **Inventory** — stock on hand by warehouse, reorder levels, expiry tracking
- **Products** — master catalogue (category, supplier, origin, MOQ, docs)
- **Reports** — conversion funnel, revenue trend, industry split, orders by warehouse
- **Tasks** — assignable to-dos linked to leads, customers, or orders
- **Meetings** — scheduled meetings with reminders on the dashboard
- **Documents** — file/document library tagged by type and related product
- **Invoices** — invoice list with line items and payment status
- **Payments** — payment records against invoices
- **Reconciliation** — aging buckets tying invoices and payments together
- **Users & Roles** — team members, roles, and per-module view/edit permissions

## Run it locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. Sign in with **any email and password** —
auth is mocked until you connect Supabase (see below). Demo data is
seeded in `src/data/seed.js` so every screen has realistic content from
the start.

## Go live with a real database (Supabase)

This takes about 5 minutes and doesn't require touching any page component.

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your project and run the contents of
   `supabase/schema.sql`. This creates all 7 tables plus row-level
   security policies.
3. In your Supabase project, go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
4. Copy `.env.example` to `.env` and paste those two values in:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart the dev server (`npm run dev`).

That's it — `src/lib/supabaseClient.js` detects the env vars and
automatically routes every page through real Supabase queries instead of
the in-memory demo store. No other file needs to change.

### Real authentication

Once connected to Supabase, go to **Authentication → Users** in your
Supabase dashboard and invite your team, or enable email/password
sign-ups. The login page already calls Supabase's real
`signInWithPassword` once `VITE_SUPABASE_URL` is set.

## Deploying

Any static host works, since this is a Vite SPA:

```bash
npm run build
```

This outputs to `dist/`. Deploy that folder to Vercel, Netlify, Cloudflare
Pages, or similar. Set your `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as environment variables in your host's project
settings (same names as `.env`).

## Project structure

```
src/
  components/     Shared UI: Shell (sidebar/topbar), Modal, Pill, StatCard, icons
  pages/          One file per module (Dashboard, Leads, Orders, …)
  lib/
    api.js              Unified data layer — pages import only from here
    supabaseClient.js   Mock/live switch — the only file you touch to go live
    mockDb.js           In-memory demo backend (used until Supabase is connected)
    AuthContext.jsx     Session state, shared via React context
  data/seed.js    Demo dataset (products, leads, customers, etc.)
supabase/
  schema.sql      Full Postgres schema + RLS policies for Supabase
```

## Customizing for your business

- **Products**: replace the list in `src/data/seed.js` (`seedProducts`) with
  your real catalogue, or import via Supabase once connected.
- **Pipeline stages**: edit `PIPELINE_STAGES` in `src/data/seed.js` — it
  drives the Leads filter, the dashboard funnel, and the reports funnel
  automatically.
- **Branding**: colors, fonts, and spacing are all defined as CSS variables
  in `src/styles/tokens.css` — change the palette there and it propagates
  everywhere.
- **Locations/godowns**: edit the `WAREHOUSES` array in `src/data/seed.js` for the starter suggestions — new locations typed into Orders or Inventory are picked up automatically after that, no separate warehouse master to maintain.
