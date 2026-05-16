# Logic & Flow

How Developer Workspace actually behaves at runtime — what loads when,
what calls what, and which technology owns each piece of state.

For the package list and project layout, see [`architecture.md`](./architecture.md).

---

## 1. First-load sequence

```
User opens http://localhost:5000
        │
        ▼
host app boots
  └─ AuthProvider mounts
       ├─ reads Supabase session from localStorage['dw:auth']
       ├─ status flips: 'loading' → 'authenticated' | 'unauthenticated' | 'demo'
       └─ writes user snapshot to localStorage['dw:currentUser']
        │
        ├─ status='unauthenticated' ─► render <AuthScreen> (sign in / up)
        │
        └─ status='authenticated' (or 'demo')
             │
             ▼
       <MainLayout> renders
         ├─ Header (tabs, user menu)
         └─ <Outlet> for routed pages
              │
              ├─ /            → <Overview>     (host page)
              ├─ /docs        → <DocsApp>      (mfe-notes remote)
              ├─ /board       → <BoardApp>     (mfe-tasks remote)
              ├─ /analytics   → <AnalyticsApp> (mfe-profile remote)
              └─ /changelog   → <Changelog>   (host page)
```

The first time a federated route is visited, Module Federation
network-fetches `http://localhost:<mfe-port>/remoteEntry.js`, resolves
the shared singleton contract, and renders the remote `App`. Subsequent
visits hit the cached module.

---

## 2. Authentication flow

### Email + password sign-up

```
AuthScreen.SignUpForm
  ├─ react-hook-form gathers { name, email, password, confirmPassword }
  ├─ Zod schema validates:
  │    name           ≥ 2 chars
  │    email          valid format
  │    password       ≥ 8 chars, strength score ≥ 2 (Fair+)
  │    confirmPwd     === password
  ├─ passwordStrength(password) updates live meter while typing
  └─ onSubmit
       │
       ▼
AuthContext.signUpWithPassword(email, password, name)
  └─ supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, name } }
      })
       │
       ▼
Supabase Auth creates the auth.users row
  └─ If email confirmation is on → returns { session: null }
  └─ Else → returns { session, user }
       │
       ▼
onAuthStateChange fires
  ├─ writeCurrentUser(snapshotFromUser(user))
  ├─ syncProfile(user) → upsert into public.profiles
  └─ status flips to 'authenticated'
       │
       ▼
React re-renders MainLayout
```

### Google OAuth

```
AuthScreen → signInWithGoogle()
  ├─ supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: window.location.origin })
  └─ Browser navigates to Google's consent screen
       │
       ▼ (after consent)
Google redirects back with #access_token=…
  └─ Supabase JS picks up the hash, exchanges for a session, writes 'dw:auth'
       │
       ▼
onAuthStateChange fires (same path as email signup from here)
```

### Why MFEs see the same session

All four front-end apps construct their own Supabase clients with the
**same** `storageKey: 'dw:auth'`. Same-origin localStorage means each
client reads the same JWT, so every Supabase query runs as the
signed-in user without any token-passing dance.

```ts
// host: refreshes token, writes to dw:auth
createClient(url, anon, { auth: { storageKey: 'dw:auth', autoRefreshToken: true } })

// every MFE: reads only, host owns refresh
createClient(url, anon, { auth: { storageKey: 'dw:auth', autoRefreshToken: false } })
```

---

## 3. Cross-MFE state — four channels

```
┌──────────────────────────────────────────────────────────────┐
│ Channel 1: Auth + identity                                   │
│   localStorage['dw:auth']         JWT + refresh token        │
│   localStorage['dw:currentUser']  { id, name, email, avatar }│
└──────────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────────┐
│ Channel 2: Domain data — source of truth = Supabase          │
│   public.profiles  ┐                                         │
│   public.tasks     │  Realtime channels fan changes          │
│   public.docs      │  out to every subscribed tab            │
│   public.activity  ┘                                         │
└──────────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────────┐
│ Channel 3: UI notifications — window CustomEvent             │
│   window.dispatchEvent(new CustomEvent('dw:toast', {...}))    │
│   Host's <Toaster> listens; any MFE can dispatch.            │
│   `toast.loading(id) → toast.success(…, { id })` flow lets   │
│   an in-flight notification swap for its terminal state in   │
│   place.                                                     │
└──────────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────────┐
│ Channel 4: Demo fallback (no env vars set)                   │
│   localStorage['dw:tasks' | 'dw:docs' | 'dw:activity']       │
│   + in-process eventBus (shared/eventBus.ts)                 │
│   + browser 'storage' event for cross-tab fanout              │
└──────────────────────────────────────────────────────────────┘
```

A single boolean — `cloudEnabled` — determines which layer is active:
```ts
export const cloudEnabled = isSupabaseConfigured && !!supabase
```

Each store checks `cloudEnabled` once at module load. CRUD methods then
branch:
- **cloud path**: optimistic local update, then fire `await patchTask(id, patch)` to Supabase. The Realtime echo refetches a fresh snapshot.
- **local path**: write to localStorage, emit on the in-process event bus, the browser's storage event fans cross-tab.

---

## 4. Creating a task — end-to-end

```
User clicks "+ New task" in the header
   │
   ▼
<NewTaskModal>                       (mfe-tasks)
  ├─ RHF + Zod form: title, description, status, priority, dueDate,
  │   storyPoints, tags, assignees[]
  ├─ AssigneePicker reads:
  │     profiles table       (signed-in users)
  │   ∪ useKnownAssignees()  (people seen on existing tasks)
  └─ onSubmit → boardStore.createTask(values)
   │
   ▼
boardStore.createTask
  ├─ Constructs Task object client-side (id = uid('t'), key = 'DW-<n+1>')
  ├─ assignee defaults to creator if values.assignees is empty
  ├─ Optimistic insert: tasks = [...get().tasks, task]
  ├─ persistLocal(tasks)  (demo mode only — no-op in cloud)
  ├─ logActivityLocal({ type: 'created' }) → activity list
  ├─ emit({ type: 'task:created', task })
  └─ if (cloudEnabled):
       ├─ currentActor() → { id, name }
       ├─ await insertTask(task, ownerId)          → INSERT into tasks
       └─ await insertActivity(entry, actor)       → INSERT into activity
   │
   ▼
Realtime echoes the INSERT to every subscribed client
  └─ subscribeTasks → fetchAllTasks → useBoardStore.setState({ tasks })
  └─ host's useTasks() refetches and the dashboard counts update
```

The optimistic update keeps the UI snappy; the Realtime echo
reconciles. Two users creating tasks at the same time end up with both
rows because each insert is independent.

---

## 5. Editing a task — assignee + drag-and-drop

### Multi-assignee edit
1. User opens `<TaskDetail>`, clicks the Assignees row.
2. `<AssigneePicker>` portals a fixed-positioned panel to `document.body`.
3. Profile list = `profiles` table ∪ historical task assignees, deduped by name.
4. Toggling a profile calls `commit({ assignees: next, assignee: next[0]?.name })`.
5. `boardStore.updateTask` writes to Supabase + logs an `edited` activity entry.
6. Realtime echoes to other tabs — the avatar stack on the kanban card updates within milliseconds.

### Drag-and-drop
1. `<DndContext>` wraps the board with PointerSensor + KeyboardSensor.
2. On drop, `boardStore.moveTask(id, toStatus, newIndex)`:
   - Rebuilds the source and target column orders client-side.
   - `patchTask(id, { status, order, completedAt })`.
   - `bulkUpdateOrders(...)` parallel-patches the shifted rows.
   - Logs a `moved` or `completed` activity entry.

---

## 6. Creating a note — modal-first flow

```
User clicks "+" in DocList     OR     presses Cmd/Ctrl+N
   │
   ▼
App.tsx setNewDocOpen(true)
   │
   ▼
<NewDocModal>
  ├─ RHF + Zod: title (1–120 chars)
  ├─ Displays author (read-only avatar + name + email from readCurrentUser)
  └─ onSubmit → docsStore.createDoc({ title })
   │
   ▼
docsStore.createDoc
  ├─ Builds Doc { id: uid('d'), ownerName: readCurrentUser().name, ... }
  ├─ Optimistic prepend + setActive(id)
  ├─ persistLocal(docs)  (demo mode only)
  ├─ emit({ type: 'doc:created', doc })
  └─ if (cloudEnabled) → insertDoc(doc, ownerId)
   │
   ▼
Realtime echoes to other clients
```

The modal pre-shows who's about to be stamped as `ownerName` so the
attribution is explicit before the row is created.

---

## 7. PDF export

```
DocEditor "Download as PDF" menu item
   │
   ▼
downloadPDF()
  ├─ setPdfBusy(true)
  ├─ const id = toast.loading('Generating PDF…', { description: title })
  └─ printDoc({ title, content, authorName: doc.ownerName })
       │
       ▼
fetch('http://localhost:5051/pdf', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ title, content, authorName }),
})
   │
       ▼
apps/pdf-service/src/server.ts  (Express)
  ├─ POST /pdf handler
  ├─ renderPrintHTML({ title, content, authorName })
  │     - marked.parse(content)  → HTML body
  │     - inlines print CSS (page size, font imports, code wrap, page breaks)
  │     - wraps in <article class="dw-print-doc">
  │
  ├─ getBrowser() → reuses warm Puppeteer Chromium
  ├─ browser.newPage()
  ├─ page.setContent(html, { waitUntil: 'networkidle0' })
  ├─ await page.evaluateHandle('document.fonts.ready')   (Google Fonts must load)
  ├─ pdf = await page.pdf({ format: 'Letter', printBackground: true,
  │                         preferCSSPageSize: true })
  ├─ page.close()
  └─ res.send(Buffer.from(pdf)) with
        Content-Type: application/pdf
        Content-Disposition: attachment; filename="<sanitized>.pdf"
   │
   ▼
Client receives blob
  ├─ triggerDownload(blob, sanitizeFilename(title) + '.pdf')
  │    └─ creates a hidden <a download href={objectURL}> and clicks it
  └─ toast.success('PDF downloaded successfully', { id })
       └─ replaces the loading toast in place
   │
   ▼
Browser shows native "Save As" dialog → user gets the PDF
```

If `fetch` throws (service down) or the response isn't OK, the catch
arm fires `toast.error('PDF generation failed', { id, description: reason })`
which swaps the loading toast for an error toast with the exact
reason. The user sees one card transition through three states
(loading → success or error), not three separate toasts stacking.

---

## 7b. Toast notifications — where they fire

The host renders one `<Toaster>` at the top-center of the viewport
(portalled to `document.body` so it sits above every modal and remote
MFE). Apps emit toasts by importing their local `shared/toast.ts`
helper, which dispatches `window.dispatchEvent(new CustomEvent('dw:toast', {...}))`.

```
Any app                            Host
   │                                │
   │  toast.success('Saved')        │
   │  → CustomEvent('dw:toast')     │
   │ ─────────────────────────────► │
   │                                │  <Toaster> useEffect subscriber
   │                                │  setToasts((prev) => [...prev, t])
   │                                │
   │                                │  After duration → CustomEvent('dw:toast:dismiss')
   │                                │  setToasts(filter out by id)
```

| Trigger                              | Fired by                       | Toast emitted                                                  |
| ------------------------------------ | ------------------------------ | -------------------------------------------------------------- |
| Click "Download as PDF"              | mfe-notes / DocEditor          | `loading: Generating PDF…`                                     |
| PDF service responds OK              | mfe-notes / DocEditor          | `success: PDF downloaded successfully` (replaces loading)      |
| PDF service unreachable or 5xx       | mfe-notes / DocEditor          | `error: PDF generation failed` + reason (replaces loading)     |
| Press Cmd/Ctrl+S in a doc            | mfe-notes / DocEditor          | `success: Saved successfully`                                  |
| Sign out from user menu              | host / Header                  | `success: Logged out successfully`                             |
| Sign out fails                       | host / Header                  | `error: Sign out failed` + reason                              |

Auto-save (the debounced write on every keystroke) does NOT fire a
toast — only the explicit Cmd+S does. This keeps the toaster from
becoming background noise.

### How the loading→terminal swap works

`toast.loading(title)` returns the toast's id. When the async work
finishes, the caller passes that id back via the `id` option:
```ts
const id = toast.loading('Generating PDF…')
try {
  await printDoc(...)
  toast.success('PDF downloaded successfully', { id })
} catch (err) {
  toast.error('PDF generation failed', { id, description: err.message })
}
```
Inside `<Toaster>`, when a `dw:toast` event arrives with an id that's
already in state, the existing toast is *replaced in place* rather
than stacked. The user sees one card animate through its kind change.

---

## 8. Realtime — how live collab works

```
Tab A: user creates task DW-12
   │
   ▼
boardStore.createTask → INSERT into tasks
   │
   ▼
Postgres writes the row, the wal2json publication picks it up
   │
   ▼
Supabase Realtime broadcasts a postgres_changes event on
the public:tasks channel
   │
   ├─► Tab A (subscribed)   ─► subscribeTasks callback fires
   │                           → fetchAllTasks() → setState({ tasks })
   │
   └─► Tab B (subscribed)   ─► same callback
                                → setState({ tasks }) → React rerender
```

Every store that cares (boardStore, docsStore, host's useTasks hooks,
the changelog) calls `subscribeTasks` / `subscribeDocs` /
`subscribeActivity` / `subscribeProfiles` and refetches a fresh
snapshot on any change. Refetching the whole table is the simpler
approach for a workspace this size — patching individual rows from
the realtime payload is faster but harder to keep coherent.

---

## 9. Routing map

| Path           | Component                  | Owned by    | Notes                                     |
| -------------- | -------------------------- | ----------- | ----------------------------------------- |
| `/`            | `Overview`                 | host        | Welcome hero + focus card + 3 app tiles   |
| `/docs/*`      | `DocsApp` (federated)      | mfe-notes   | List + editor, slash menu, PDF download   |
| `/board/*`     | `BoardApp` (federated)     | mfe-tasks   | Kanban board, filters, task drawer        |
| `/analytics/*` | `AnalyticsApp` (federated) | mfe-profile | Heatmap, velocity, completion charts      |
| `/changelog`   | `Changelog`                | host        | Activity timeline grouped by day          |
| `/tasks/*`     | `Navigate to="/board"`     | host        | Legacy redirect                            |
| `/notes/*`     | `Navigate to="/docs"`      | host        | Legacy redirect                            |
| `/profile/*`   | `Navigate to="/analytics"` | host        | Legacy redirect                            |

---

## 10. Demo mode vs cloud mode

The app is built so that any subset of the env / services can be
missing without breaking the page:

| Env state                                | Mode             | What works                                                      |
| ---------------------------------------- | ---------------- | --------------------------------------------------------------- |
| No `VITE_SUPABASE_*`                     | **demo**         | localStorage only. Seeded sample data. No auth screen — auto-allow. |
| Supabase set, pdf-service down           | cloud, no PDF    | Everything except PDF. Toast tells user to start the service.  |
| Both set                                 | **full cloud**   | Auth, realtime collab, PDFs, profile dropdowns                  |

The fall-through is what lets the project boot for a recruiter
clicking through it without any setup work.

---

## 11. State ownership cheat sheet

| State                            | Owned by                                      | Synced via                          |
| -------------------------------- | --------------------------------------------- | ----------------------------------- |
| Auth session                     | Supabase (host writes, MFEs read)             | `localStorage['dw:auth']`           |
| Current user snapshot            | Host's AuthContext                            | `localStorage['dw:currentUser']`    |
| Tasks list                       | Supabase `public.tasks`                       | Realtime channel + cloud repo       |
| Notes list                       | Supabase `public.docs`                        | Realtime channel + cloud repo       |
| Activity feed                    | Supabase `public.activity`                    | Realtime channel + cloud repo       |
| Profiles (assignee dropdown)     | Supabase `public.profiles`                    | Realtime channel + safety upsert     |
| Active doc id                    | mfe-notes localStorage `dw:docs:active`        | Local-only (per-tab UX preference)  |
| Sidebar collapsed state          | mfe-notes localStorage `dw:docs:listCollapsed` | Local-only                          |
| Kanban filters                   | mfe-tasks in-memory state                      | Local-only                          |
| Auth provider                    | `apps/host/src/auth/AuthContext.tsx`           | React context                       |
| Board store                      | `apps/mfe-tasks/src/store/boardStore.ts`       | zustand                              |
| Docs store                       | `apps/mfe-notes/src/store/docsStore.ts`        | zustand                              |

---

## 12. What runs where

| Concern             | Layer              | Tech                                |
| ------------------- | ------------------ | ----------------------------------- |
| Identity & auth     | Supabase Auth      | GoTrue (managed), Google OAuth      |
| Persistence         | Supabase Postgres  | Postgres 15 + RLS                   |
| Live updates        | Supabase Realtime  | Postgres → WAL → WebSocket          |
| Form validation     | Browser            | react-hook-form + zod               |
| Drag-and-drop       | Browser            | @dnd-kit (pointer + keyboard sensors) |
| Markdown rendering  | Browser + Server   | marked (same lib on both sides)     |
| Charts              | Browser            | recharts                             |
| PDF generation      | Node service       | Puppeteer + Chromium                 |
| Module loading      | Browser at runtime | Module Federation v2                 |
| Routing             | Browser            | react-router-dom v6                  |
| Icons               | Browser            | lucide-react (every icon comes from this single library) |
| Date math           | Browser + Server   | date-fns                             |
| Toast notifications | Browser            | window CustomEvent bus + portalled `<Toaster>` |
| Favicon             | Browser            | SVG with brand mark, theme-color in `<meta>` |

---

## 13. Failure modes & their handling

| Failure                                          | What happens                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Supabase env vars missing                        | `cloudEnabled = false`. Demo mode kicks in. Seed data renders.                                     |
| Network drop while editing                       | Optimistic update is already applied. Async `patchTask` fails silently with a `console.error`. Realtime will reconcile when the connection comes back. |
| Two users edit the same field                    | Last write wins (Postgres). The losing client gets the final value via Realtime echo.              |
| pdf-service is down                              | `fetch` throws → `PdfServiceError`. The in-flight loading toast swaps in place to an error toast with the start command in its description. |
| Profile row missing for a teammate               | `useKnownAssignees` synthesizes a "legacy" entry from existing task assignees so they're pickable. |
| Puppeteer cold start                             | First `/pdf` request takes ~30–50s. Subsequent requests reuse the warm browser, ~150ms.            |
| MFE remoteEntry.js fails to load                 | React boundary at the host catches the dynamic-import rejection; route shows an error message.     |

---

## 14. Putting it together — a 30-second tour

1. Open `http://localhost:5000`.
2. Land on `<AuthScreen>` (or skip if demo mode).
3. Sign in. `AuthProvider` writes `dw:auth` + `dw:currentUser`, syncs `profiles`.
4. `<Overview>` reads `tasks` / `docs` / `activity` from Supabase, subscribes to Realtime.
5. Click "Tasks" → host fetches `http://localhost:5001/remoteEntry.js` → renders `<BoardApp>`.
6. `boardStore.hydrate()` fetches tasks + activity, opens two Realtime channels, upserts the current user into `profiles` as a safety net.
7. Drag a card to In Progress → `boardStore.moveTask` → optimistic UI + Supabase patch + activity log.
8. Click "Notes" → host fetches `http://localhost:5002/remoteEntry.js` → renders `<DocsApp>`.
9. Click "+" → `<NewDocModal>` opens → submit → `docsStore.createDoc` writes to Supabase.
10. Click "Download as PDF" → fetch POST to `:5051/pdf` → Puppeteer renders → blob downloads as `.pdf`.
11. Open the same workspace in a second browser; every change in step 7-9 appears live via Realtime.
