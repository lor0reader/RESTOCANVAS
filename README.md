# RestoCanvas

Web app for managing a restaurant floorplan, table reservations, and shift roles. Built with Next.js 16 (App Router), React 19, and TypeScript.

State is stored locally in `.data/restaurant-state.json` through Next.js API routes, so it runs on an office or venue LAN without an external database. There is also optional Supabase helper code under `utils/supabase/` if you want hosted persistence.

## What it does

- Interactive hall map with live table status and waiter assignment
- Booking management across time slots
- Separate views for admin, manager, and waitstaff accounts
- Shift task checklist and daily summary view

## Layout

- `app/api/restaurant/state/` handles reading and saving JSON state
- `app/restaurant/` contains the floorplan and shift dashboard pages
- `src/styles.css` holds the stylesheets
- `utils/supabase/` has optional Supabase client and server helpers

## Running locally

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/lor0reader/RESTOCANVAS.git
cd RESTOCANVAS
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run start
```

If you wire up Supabase, copy `.env.example` to `.env.local` and fill in your project URL and publishable key.
