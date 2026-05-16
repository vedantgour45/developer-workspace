# Architecture

Developer Workspace is a federated micro-frontend application with a
single shared Supabase backend, a small Node service for PDF generation,
and a coordinated set of independent React apps that mount into a host
shell at runtime.

This document covers the moving parts, how they're wired together, and
why each third-party package is in the dependency tree.

---

## 1. Apps in the monorepo

```
project/
├── apps/
│   ├── host/         (port 5000)  — shell, auth, dashboard, routing
│   ├── mfe-notes/    (port 5002)  — Notes / Markdown editor MFE
│   ├── mfe-tasks/    (port 5001)  — Kanban / Tasks MFE
│   ├── mfe-profile/  (port 5003)  — Analytics MFE
│   └── pdf-service/  (port 5051)  — Express + Puppeteer PDF generator
├── supabase/
│   └── schema.sql                  — DB migration (idempotent)
├── docs/
│   ├── architecture.md             — this file
│   ├── logic.md
│   ├── design.md
│   └── faq.md
└── package.json
```

Every `apps/<name>` is an independent npm project with its own
`package.json`, `tsconfig`, Vite config, Tailwind config, and build
output. No code is imported across packages at build time; the host
discovers remotes at **runtime** via Module Federation.

### Roles

| App         | Role                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| host        | Top-level shell — routing, auth, header, dashboard, changelog page      |
| mfe-tasks   | Kanban board with task CRUD, multi-assignee, drag-and-drop, comments    |
| mfe-notes   | Block-style markdown editor with slash menu, split preview, PDF export  |
| mfe-profile | Analytics dashboard (heatmap, charts, completion velocity)              |
| pdf-service | Headless-Chrome service that converts a doc payload into a printed PDF  |

---

## 2. Runtime topology

```
┌────────────────────────────────────────────────────────────────────┐
│ Browser                                                            │
│                                                                    │
│   host  ──────  loads at runtime  ──►  mfe-notes / mfe-tasks /     │
│    │                                   mfe-profile                 │
│    │                                                               │
│    └─ all four apps share React, ReactDOM, Router via federation   │
│       and the same `dw:auth` localStorage session                  │
└────────────────────────────────────────────────────────────────────┘
            │                              │
            │ Supabase JS SDK              │ fetch /pdf
            │ (HTTP + WebSocket)           │ (HTTP JSON)
            ▼                              ▼
   ┌────────────────────┐         ┌─────────────────────────┐
   │ Supabase           │         │ apps/pdf-service        │
   │  • Auth (GoTrue)   │         │  Express + Puppeteer    │
   │  • Postgres + RLS  │         │  → headless Chromium    │
   │  • Realtime fanout │         │  → returns application/pdf │
   │  • Storage (n/a)   │         │                         │
   └────────────────────┘         └─────────────────────────┘
```

The host owns the auth lifecycle and broadcasts the current user via
localStorage so MFEs can render names and avatars without a second
sign-in. Each MFE talks to Supabase directly for its own domain
(tasks → tasks table, notes → docs table), and they all subscribe to
Realtime channels so live edits show up across tabs and users.

---

## 3. Module Federation

Federation is wired with [`@module-federation/vite`](https://module-federation.io/).
The host declares three remotes pointing at the MFE preview servers:

```ts
// apps/host/vite.config.ts
federation({
  name: 'host',
  remotes: {
    board:     { entry: 'http://localhost:5001/remoteEntry.js' },
    docs:      { entry: 'http://localhost:5002/remoteEntry.js' },
    analytics: { entry: 'http://localhost:5003/remoteEntry.js' },
  },
  shared: {
    react:             { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom':       { singleton: true, requiredVersion: '^18.0.0' },
    'react-router-dom':{ singleton: true, requiredVersion: '^6.0.0' },
  },
})
```

### What "shared singleton" buys us
React only ships **once** in the page. If each MFE bundled its own
React, hook state would be quietly broken across the boundary — two
copies of `useRef` give two refs, two reconcilers fight over the same
DOM, and dev tools log `Cannot read 'useRef' of null`. Marking React,
ReactDOM, and React Router as `singleton: true` forces every MFE to
pick up whichever copy loads first.

### Why we moved off `@originjs/vite-plugin-federation`
Earlier iterations used the OriginJS plugin and we hit a dual-React
bug that took the workspace offline. `@module-federation/vite` is the
official Module Federation v2 implementation, supports `bundleAllCSS`,
and resolves the singleton contract correctly with Vite 5.

---

## 4. The host app

| Concern               | Implementation                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| Routing               | `react-router-dom@6` with a `MainLayout` route wrapping Overview, Notes, Tasks, Analytics, Changelog |
| Auth                  | `@supabase/supabase-js` client with `storageKey: 'dw:auth'`, plus an `AuthProvider` context     |
| Dashboard data        | `useTasks` / `useDocs` / `useActivity` hooks read from Supabase + subscribe to Realtime         |
| Cross-MFE user info   | `writeCurrentUser` mirrors the auth snapshot to `localStorage['dw:currentUser']`                |
| MFE loading           | `<BoardApp />`, `<DocsApp />`, `<AnalyticsApp />` are remote components imported via Federation |
| Forms                 | `react-hook-form` + `zod` (AuthScreen sign-in/sign-up, password strength meter)                  |
| Icons                 | `lucide-react`                                                                                   |
| Dates                 | `date-fns`                                                                                       |

### Notable host files

```
apps/host/
├── public/
│   └── favicon.svg          — coral 4-point star on near-black tile
├── index.html               — viewport, favicon, theme-color, OG tags
└── src/
    ├── App.tsx              — route map + seed on first run
    ├── layouts/MainLayout.tsx
    │                        — header + outlet shell + global <Toaster />
    ├── components/
    │   ├── Header.tsx       — top nav (tabs, new task, user menu)
    │   ├── HelpModal.tsx    — keyboard shortcuts + workspace reset
    │   ├── ConfirmModal.tsx — reusable confirm dialog
    │   ├── Toaster.tsx      — top-center toast stack (portalled to body)
    │   └── BrandMark.tsx    — SVG brand glyph (also used as favicon)
    ├── auth/
    │   ├── AuthContext.tsx  — Supabase session lifecycle + profile upsert
    │   ├── AuthScreen.tsx   — split-screen sign in / sign up (RHF + Zod)
    │   ├── PasswordStrengthMeter.tsx
    │   ├── passwordStrength.ts  — pure scoring function
    │   └── supabase.ts      — typed Supabase client
    ├── shared/
    │   ├── cloudRepo.ts     — fetchAllTasks / fetchAllDocs / subscribeTable
    │   ├── useTasks.ts      — host data hooks (cloud + demo fallback)
    │   ├── currentUser.ts   — broadcasts user snapshot to localStorage
    │   ├── toast.ts         — toast event bus (window CustomEvents)
    │   └── seed.ts          — demo-mode sample data
    ├── pages/
    │   ├── Overview.tsx     — single-viewport dashboard with hero
    │   └── Changelog.tsx    — activity timeline grouped by day
    └── remotes/
        ├── BoardApp.tsx     — lazy-loads tasks/App from federation
        ├── DocsApp.tsx      — lazy-loads docs/App
        └── AnalyticsApp.tsx — lazy-loads analytics/App
```

---

## 5. The MFEs

### mfe-tasks (Kanban)

| Concern               | Implementation                                                       |
| --------------------- | -------------------------------------------------------------------- |
| State                 | `zustand` store (`boardStore.ts`) with optimistic local updates      |
| Cloud sync            | `tasksRepo.ts` wraps Supabase CRUD + Realtime channels                |
| Drag and drop         | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`         |
| Forms                 | `react-hook-form` + `zod` (NewTaskModal)                              |
| Date picker           | Custom `DatePicker.tsx` (portalled, today-highlighted)               |
| Assignee picker       | Multi-select `AssigneePicker.tsx` reading from `profiles` table       |
| Markdown rendering    | `lib/miniMarkdown.ts` (in-house safe renderer for descriptions)      |

### mfe-notes (Markdown editor)

| Concern               | Implementation                                                  |
| --------------------- | --------------------------------------------------------------- |
| State                 | `zustand` store (`docsStore.ts`)                                |
| Cloud sync            | `docsRepo.ts` wraps Supabase CRUD + Realtime                    |
| Markdown parser       | `marked` (lazy-imported), GFM enabled, with callout preprocess  |
| Slash command menu    | Portalled `SlashCommandMenu.tsx` positioned at caret             |
| Split / Write / Read  | `SplitPane.tsx` with localStorage-persisted width                |
| PDF export            | POST → `apps/pdf-service` and trigger blob download              |
| New doc modal         | `react-hook-form` + `zod` (title + author preview)              |

### mfe-profile (Analytics)

| Concern               | Implementation                                                 |
| --------------------- | -------------------------------------------------------------- |
| Charts                | `recharts` line + bar + heatmap                                |
| Data                  | Reads `dw:tasks` / `dw:activity` localStorage mirrors          |
| Date math             | `date-fns` (`startOfDay`, `subDays`, etc.)                     |

---

## 6. PDF service

```
apps/pdf-service/
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts        — Express app
    └── renderHTML.ts    — markdown → print-ready HTML (with inlined CSS)
```

| Concern             | Implementation                                                                     |
| ------------------- | ---------------------------------------------------------------------------------- |
| HTTP framework      | `express` + `cors`                                                                 |
| Headless browser    | `puppeteer` (downloads its own Chromium on install)                                |
| Markdown parser     | `marked` — same library the MFE uses, so output matches the on-screen preview      |
| Process model       | Long-lived: one Chromium instance is kept warm; new tab per request, closed on done |
| Endpoints           | `POST /pdf` (returns `application/pdf` blob), `GET /health`                        |
| Run                 | `npm run dev` (tsx watch) or `npm start`                                           |

The reason this is a server rather than browser-side: Puppeteer is a
Node-only library. There's no in-browser equivalent that produces the
same fidelity. A small dedicated service keeps the MFE bundle tiny and
gives us a real Chromium rendering pipeline.

---

## 7. Database — Supabase

A single Postgres database with four tables, all under one shared
workspace (no per-user partitioning — every signed-in user can read
and write every row, by design).

```sql
-- supabase/schema.sql
profiles  (id uuid PK ← auth.users, name, email, avatar_url)
tasks     (id text PK, key, title, status, priority, tags, assignee,
           assignees jsonb, story_points, due_date, subtasks jsonb,
           comments jsonb, order, owner_id, owner_name, timestamps)
docs      (id text PK, title, content, emoji, cover jsonb, tags,
           pinned, owner_id, owner_name, timestamps)
activity  (id text PK, task_id, task_title, type, from_status, to_status,
           actor_id, actor_name, at)
```

| Feature             | Implementation                                                          |
| ------------------- | ----------------------------------------------------------------------- |
| Auth                | Supabase Auth (GoTrue) — email/password + Google OAuth                  |
| Row Level Security  | One policy per table: `to authenticated using (true) with check (true)` |
| Live updates        | All four tables in the `supabase_realtime` publication                  |
| Profile upsert      | `AuthContext.syncProfile` on every auth state change + safety net in boardStore.hydrate |

### Why a shared workspace
The portfolio target is "shows collaboration." A single workspace
where every signed-in user can see and edit everything makes the
Realtime demo land hard: open the app in two browsers, edit a task in
one, watch it move in the other. Per-user partitioning would have
been a one-line RLS change but a much less interesting demo.

---

## 8. Authentication

| Layer        | Tech                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| Provider     | Supabase Auth (GoTrue), Google OAuth + email/password                         |
| Client       | `@supabase/supabase-js` configured with `storageKey: 'dw:auth'`               |
| Cross-MFE    | All MFEs construct their own Supabase clients with the SAME storage key      |
| Refresh      | Host only — MFEs use `autoRefreshToken: false` to avoid duplicate refresh     |
| Token        | JWT stored under `localStorage['dw:auth']`; MFEs read it for queries          |
| User snapshot| `localStorage['dw:currentUser']` mirrors `{ id, name, email, avatarUrl }`     |
| Validation   | Zod schemas — email format, password strength, confirm-password match        |

---

## 9. Cross-MFE communication

Four channels of state flow between apps:

1. **Auth + user identity** — `localStorage['dw:auth']` and
   `localStorage['dw:currentUser']`. Same-origin localStorage is
   readable by every MFE.
2. **Domain data** — Supabase tables (`tasks`, `docs`, `activity`,
   `profiles`) with Realtime channels. Any edit broadcasts to every
   subscribed client.
3. **UI notifications** — window-level `CustomEvent` bus
   (`dw:toast` / `dw:toast:dismiss`). Any app fires
   `toast.success('…')` and the host's single `<Toaster>` catches the
   event and renders the notification. Same pattern works for any
   future global-UI signal (e.g. workspace-reset broadcast).
4. **Demo fallback** — when Supabase env vars are empty, MFEs persist
   to `localStorage['dw:tasks' | 'dw:docs' | 'dw:activity']` and a
   tiny in-process event bus (`shared/eventBus.ts`) fans out updates
   within the same window. Cross-window updates fall back to the
   browser's native `storage` event.

### Why `window.CustomEvent` for toasts and not Context?

The host's React tree doesn't wrap the MFE remotes — they mount
their own roots side-by-side under the same React singleton. So a
`<ToastProvider>` in the host can't reach into a remote's component
tree. Three options were considered:

- **Shared module via federation expose** — viable but couples each
  MFE's build graph to the host's. We want federated *runtime*
  composition, not a lockstep package contract.
- **localStorage flag with subscription** — works but feels wrong for
  ephemeral notifications.
- **Window `CustomEvent`** — same-origin event bus, framework-free,
  works in any JS context. MFEs dispatch, host listens. The
  `apps/<app>/src/shared/toast.ts` helper is byte-identical across
  apps; they all dispatch to the same channel.

The same pattern lets the host coordinate any cross-MFE UI signal
without making the MFEs aware of each other.

---

## 10. Styling

| Layer              | Implementation                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| Utility CSS        | `tailwindcss` 3 (per-app config so MFEs build their own utility bundle)   |
| Design tokens      | Hand-rolled CSS variables + Tailwind theme extensions (see `docs/design.md`) |
| Icons              | `lucide-react` — single source of truth for every icon. Doc icons were emoji-based originally; switched to `<FileText />` for crisp rendering at every zoom and a consistent visual voice. |
| Custom components  | Inline JSX with Tailwind classes + a small handful of inline `style` props for things that can't depend on the class scanner (modal widths, popover positions, toast palette) |
| Markdown prose     | `.dw-prose` global class in each MFE's `index.css` with `!important` so the cross-MFE CSS cascade can't override it |
| Animations         | Hand-rolled keyframes in each `index.css`: `dw-fade-up`, `dw-spin`, `dw-toast-in`, `dw-toast-out` |
| Favicon            | `apps/host/public/favicon.svg` — same 4-point brand star as `BrandMark.tsx`, coral on a near-black rounded tile. SVG so it scales crisply to any tab size. Linked via `<link rel="icon" type="image/svg+xml">` in `index.html` with `theme-color: #181715` for browser chrome. |

The Cohere-style theme is documented separately in
[`docs/design.md`](./design.md). Short version: white canvas, near-black
primary, coral accent, Space Grotesk display + Inter body.

### Global toaster

The host renders a single `<Toaster>` (top-center, portalled to
`document.body`) that subscribes to the `dw:toast` window bus. Any
app posts a notification through the `toast.success / error / info /
loading` helper. Loading toasts can be replaced in place with their
terminal outcome by passing the original toast id — that's how the
PDF flow shows "Generating PDF…" then transitions to either "PDF
downloaded successfully" or an error in the same card.

---

## 11. Package-by-package reasoning

### Production dependencies

| Package                                 | Where                  | Why                                                                                          |
| --------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `react`, `react-dom`                    | all front-ends         | UI framework; shared singleton across MFEs                                                   |
| `react-router-dom`                      | all front-ends         | Client-side routing in the host; MFEs use it for sub-routes                                  |
| `@supabase/supabase-js`                 | host, mfe-tasks, mfe-notes | Auth + DB + Realtime client SDK                                                          |
| `zustand`                               | mfe-tasks, mfe-notes   | Small in-memory store for board / docs state with subscribe/select                            |
| `react-hook-form`                       | host, mfe-tasks, mfe-notes | Performant uncontrolled forms with built-in error model                                    |
| `zod`                                   | host, mfe-tasks, mfe-notes | Schema-first validation; `zodResolver` bridges it to RHF                                  |
| `@hookform/resolvers`                   | host, mfe-tasks, mfe-notes | Glue between Zod schemas and react-hook-form                                              |
| `@dnd-kit/core/sortable/utilities`      | mfe-tasks              | Accessible drag-and-drop for kanban columns + keyboard nav                                   |
| `marked`                                | mfe-notes, pdf-service | Markdown → HTML, GFM enabled                                                                  |
| `date-fns`                              | all                    | Date formatting + arithmetic; tree-shakes well                                                |
| `lucide-react`                          | all                    | Icon set — consistent 1.5px stroke vibe matches the design system                            |
| `recharts`                              | mfe-profile            | Composable React chart primitives for the analytics page                                     |
| `puppeteer`                             | pdf-service            | Drives a headless Chromium to render PDFs with full CSS fidelity                              |
| `express`, `cors`                       | pdf-service            | HTTP server + cross-origin support for the dev client                                         |

### Dev / build dependencies

| Package                              | Why                                                            |
| ------------------------------------ | -------------------------------------------------------------- |
| `vite` + `@vitejs/plugin-react`      | Dev server + production build for each app                     |
| `@module-federation/vite`            | The actual federation runtime (replaces OriginJS plugin)       |
| `typescript`                         | Type checking across all apps                                  |
| `tailwindcss` + `postcss` + `autoprefixer` | Utility CSS pipeline                                     |
| `concurrently`                       | Runs `vite build --watch` + `vite preview` together in `npm run dev` |
| `tsx`                                | Run TypeScript directly in Node for the pdf-service             |
| `@types/*`                           | TS types for node, react, express, cors                         |

---

## 12. Build & run

```bash
# In four terminals, one per app:
cd apps/host        && npm run dev   # port 5000
cd apps/mfe-tasks   && npm run dev   # port 5001
cd apps/mfe-notes   && npm run dev   # port 5002
cd apps/mfe-profile && npm run dev   # port 5003

# Plus the PDF service:
cd apps/pdf-service && npm run dev   # port 5051
```

The host loads remotes from their preview servers; each MFE rebuilds
on save and the host picks up the new `remoteEntry.js` on next route
change. `concurrently` keeps the watcher and preview server in lockstep
inside a single `npm run dev`.

---

## 13. Deployment notes

- The host and each MFE produce a normal Vite `dist/`. Deploy each as
  a static bundle behind any CDN; the host's `remotes` config flips to
  the deployed origins.
- The PDF service runs as a long-lived Node process. Any container
  host with Puppeteer's Chromium prerequisites works. Set
  `ALLOWED_ORIGIN` to your deployed host URL.
- Supabase needs `supabase/schema.sql` run once in the SQL editor +
  the realtime publication confirmed.

---

## 14. Design system reference

See [`docs/design.md`](./design.md) for the full Cohere-style design
audit: colours, type scale, component shapes, spacing rhythm, do/don't
guidelines.

For the application flow and how the parts talk to each other in
practice, see [`docs/logic.md`](./logic.md).

For interview-prep questions and answers about why the architecture
looks the way it does, see [`docs/faq.md`](./faq.md).
