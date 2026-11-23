# RestoCanvas

Interactive restaurant floorplan, table reservation, and shift-operations dashboard built with **Next.js 16 (App Router)**, **React 19**, and **TypeScript**.

## Overview

RestoCanvas provides front-of-house staff and managers with a unified interface to manage seating layouts, real-time table occupancy, reservations, operational tasks, and role-based permissions. Application state is persisted locally through Next.js API routes (`.data/restaurant-state.json`) with optional Supabase integration scaffolding.

## Key Features

- **Interactive Floorplan & Table State:** Visual hall map tracking live occupancy, active sessions, and waiter assignment per table.
- **Reservation Workflow:** Create, edit, confirm, and seat reservations with conflict awareness across time slots.
- **Role-Based Views:** Separate operational views for Administrators, Managers, and Waitstaff.
- **Shift Tasks & Reporting:** Lightweight operational checklist and end-of-shift activity overview.
- **Offline / Local-First Friendly:** Runs cleanly on a local network node without requiring an external database.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, TypeScript, modular Vanilla CSS
- **Persistence:** Local JSON state API (`app/api/restaurant/state`), optional `@supabase/ssr` & `@supabase/supabase-js` helpers

## Structure

- `app/api/restaurant/state/` — Local state API handlers
- `app/restaurant/` — Floorplan & operations dashboard views
- `src/styles.css` — Core application styles
- `utils/supabase/` — Optional Supabase client/server helpers
- `.env.example` — Environment variable template

## Getting Started

Prerequisites: Node.js 20+ and npm 10+.

```bash
git clone https://github.com/lor0reader/RESTOCANVAS.git
cd RESTOCANVAS
npm install
cp .env.example .env.local
npm run dev
```

Production build: `npm run build && npm run start`.

> **Security Note:** Never commit real API keys, `.env.local`, or `.data/` state files to version control.
