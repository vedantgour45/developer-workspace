# Developer Workspace

A federated micro-frontend workspace — **Notes**, **Tasks**, and **Analytics** —
that loads three independent React apps into a host shell at runtime, syncs
state across users live via Supabase, and renders PDFs through a
Puppeteer-backed service.

It exists to demonstrate the production patterns that come with running a
real micro-frontend system: shared React singletons across federated
bundles, cross-app state without build-time coupling, optimistic UI
reconciled against a server-of-record, and an independent build & deploy
pipeline per app.

---

## Highlights

- **Module Federation v2** via `@module-federation/vite`. React, ReactDOM,
  and React Router are shared singletons across the host and three
  remotes — no dual-React traps, no duplicate routers.
- **Live multi-user collaboration**. Tasks, notes, activity, and the user
  directory live in Supabase; every signed-in client subscribes to
  Realtime channels and reconciles the local store on every change.
  Open the app in two browsers, edit in one, watch the other update in
  under 200ms.
- **Optimistic UI with server reconcile**. Stores apply changes locally
  for snappy interaction, then fire off the write. The Realtime echo
  refetches a fresh snapshot to heal any drift.
- **Auth with Supabase**. Email/password and Google OAuth. The host owns
  the session; each MFE reads the same JWT from `localStorage` so cross-MFE
  identity is free.
- **PDF generation via Puppeteer**. A standalone Express service drives a
  headless Chromium that prints documents with full CSS fidelity — fonts,
  callouts, code-block wrapping, page-break rules. No `jsPDF` quirks.
- **Cross-MFE UI bus**. Toasts, status messages, and any other global
  signals flow over a `window.CustomEvent` bus — federation-agnostic and
  framework-free.
- **Schema-first forms**. `react-hook-form` + `zod`, with a custom
  password-strength scorer that runs entropy + common-password checks
  in-browser.
- **Polished interactions**. Drag-and-drop kanban with `@dnd-kit`,
  portalled popovers that escape `transform` ancestors, a slash command
  menu in the editor, on-brand confetti when a task moves to *Done*.

---

## Stack

| Layer            | Tech                                                           |
| ---------------- | -------------------------------------------------------------- |
| Frontend         | React 18 · TypeScript · Vite 5 · Tailwind CSS 3                |
| Federation       | `@module-federation/vite` (Module Federation v2)               |
| State            | `zustand` (per MFE), React Context (host auth)                 |
| Auth / DB        | Supabase (GoTrue + Postgres + Realtime)                        |
| Forms            | `react-hook-form` + `zod` + `@hookform/resolvers`              |
| Drag and drop    | `@dnd-kit/core` + `sortable` + `utilities`                     |
| Charts           | `recharts`                                                     |
| Markdown         | `marked` (GFM, lazy-imported)                                  |
| Icons            | `lucide-react`                                                 |
| Dates            | `date-fns`                                                     |
| PDF service      | Express · Puppeteer · `marked` · `tsx`                         |

---

## Architecture at a glance

```
                    ┌──────────────────────────────────┐
                    │            Browser               │
                    │  ┌────────────────────────────┐  │
                    │  │   host (apps/host)         │  │
                    │  │  Auth · Dashboard · Routes │  │
                    │  └─────┬───────┬───────┬──────┘  │
                    │        │       │       │         │
                    │  loads MFEs from their origins   │
                    │   via Module Federation v2       │
                    │        │       │       │         │
                    │   ┌────▼─┐ ┌───▼──┐ ┌──▼────┐    │
                    │   │tasks │ │notes │ │profile│    │
                    │   └──────┘ └──────┘ └───────┘    │
                    └──────┬───────────────────┬───────┘
                           │                   │
                           │ JS SDK            │ fetch /pdf
                           ▼                   ▼
                  ┌───────────────────┐  ┌──────────────────┐
                  │ Supabase          │  │ pdf-service      │
                  │  Auth · Postgres  │  │ Express +        │
                  │  Realtime · RLS   │  │ Puppeteer        │
                  └───────────────────┘  └──────────────────┘
```

The host owns the auth flow and the dashboard. Each MFE owns its own
domain (tasks, notes, analytics) and talks to Supabase directly. The PDF
service is a thin Node process the notes app posts to.

Full breakdown in [`docs/architecture.md`](./docs/architecture.md).

---

## Running locally

You need Node 20+, npm, and a Supabase project (free tier is fine). The
project also works in **demo mode** without Supabase keys — it falls
back to localStorage with sample data so you can boot it cold.

### 1 · Install

```bash
npm install
```

This bootstraps every workspace under `apps/`. The first install pulls
Puppeteer's Chromium binary (~170MB) for the PDF service.

### 2 · Supabase

In your Supabase project's SQL editor, paste and run
[`supabase/schema.sql`](./supabase/schema.sql). It's idempotent — safe to
re-run if you bump it.

Copy `.env.example` → `.env.local` in each of:

- `apps/host/`
- `apps/mfe-tasks/`
- `apps/mfe-notes/`

and fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Use the same
values across all three.

### 3 · Run all four front-end apps at once

```bash
npm run dev
```

This builds the three remotes, then spins up:

| App         | URL                       |
| ----------- | ------------------------- |
| host        | http://localhost:5000     |
| mfe-tasks   | http://localhost:5001     |
| mfe-notes   | http://localhost:5002     |
| mfe-profile | http://localhost:5003     |

### 4 · Run the PDF service

In a separate terminal:

```bash
cd apps/pdf-service
npm run dev
```

Listens on `http://localhost:5051`. The notes app POSTs to it for
"Download as PDF"; if it isn't running, a toast tells you.

---

## Project structure

```
.
├── apps/
│   ├── host/             host shell — auth, routing, dashboard
│   ├── mfe-tasks/        kanban board MFE (port 5001)
│   ├── mfe-notes/        markdown editor MFE (port 5002)
│   ├── mfe-profile/      analytics MFE (port 5003)
│   └── pdf-service/      Express + Puppeteer (port 5051)
├── supabase/
│   └── schema.sql        full DB migration + RLS + realtime publication
├── docs/
│   ├── architecture.md   apps, packages, runtime topology
│   ├── logic.md          flow diagrams, state ownership, failure modes
│   └── design.md         Cohere-style design system audit
└── package.json          npm workspaces root
```

Each `apps/<name>/` is an independent npm project with its own
`package.json`, Vite config, Tailwind config, and build output.

---

## Deployment

The system deploys as **5 independent units**:

- **Host** → Vercel / Netlify (static SPA).
- **mfe-tasks / mfe-notes / mfe-profile** → Vercel / Netlify, each as its
  own project pointing at `apps/<name>/`.
- **pdf-service** → Render (free, sleeps on idle), Fly.io (free with a
  card on file, no cold starts), or Railway (paid — $5/month after the
  $5 trial credit). Vercel's serverless model doesn't suit Puppeteer.

The host reads the deployed MFE URLs and the PDF service URL from
build-time env vars, so swapping a remote is just an env change + redeploy.

---

## Documentation

- [`docs/architecture.md`](./docs/architecture.md) — every moving part,
  why each package is in the tree, federation topology, schema.
- [`docs/logic.md`](./docs/logic.md) — runtime flow: auth, task creation
  end-to-end, realtime echo, PDF generation, toast bus, failure modes.
- [`docs/design.md`](./docs/design.md) — design system reference (colour
  palette, type scale, component specs, spacing rhythm).

---

## License

MIT.
