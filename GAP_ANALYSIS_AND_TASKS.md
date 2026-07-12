# MaintainIQ — Gap Analysis & Task List

## Progress log

**P0 (security) — done:**
- Added `backend/middleware/auth.js` (JWT verify + role guard); applied to all internal asset/issue/maintenance/user routes and `/api/health/reset`.
- `POST /api/auth/register` now always creates a `Technician`; Admin/Supervisor accounts are created via `POST /api/users` (Admin-only).
- Removed the hardcoded JWT secret fallback; rotated the placeholder in `.env` (**replace it with a real random secret before deploying**).
- Added issue status state-machine validation, "resolved needs a maintenance note" check, negative-cost / next-service-date validation, and asset-status enum (`Asset.js`) with the missing `Under Inspection` / `Out of Service` event mappings wired into `issues.js`.

**P1 (core functionality) — done:**
- Discovered and fixed a major architecture bug: **`admin/index.html` (the app that actually runs) was calling the real Express backend but never sending the `Authorization` header**, so after the P0 auth middleware landed it would have silently 401'd on every request and fallen back to demo/localStorage data. Added a shared `apiFetch()`/`authHeaders()` helper and repointed every `fetch()` call in `admin/index.html` through it, with auto-redirect to `auth.html` on session expiry.
- Also discovered `admin/src/*.jsx` (a separate Vite/React scaffold) is **dead code** — never loaded by `index.html`. It was rewired to the real backend anyway (in case the project switches to it later) but is not currently in the runtime path. Worth deleting or wiring up deliberately, not both.
- Built the public, unauthenticated asset page: `backend/routes/public.js` (`GET /public/asset/:code`, safe fields only, proper 404, `Retired` flag) and a static `public.html` (asset info + issue-report form with AI-triage-assisted fill, reviewable/editable before submit).
- Fixed QR generation (`admin/index.html` and `admin/src/pages/QrCodes.jsx`) to point at `public.html?code=...` instead of a non-existent route, and to fetch real assets instead of mock data (Vite app only, since that's where mock data lived).
- Added missing backend endpoints the frontend already expected: `GET /api/stats`, `/api/technicians`, `/api/categories`, `/api/locations` (new `backend/routes/meta.js`); extended `GET /api/assets` with `category`/`status`/`skip`/`limit` + `X-Total-Count`.
- `POST /api/issues` now accepts either `asset_id` or `asset_code` (resolves server-side) so the public report form doesn't need to expose internal Mongo ids.

**Verified:** syntax-checked all changed backend files; started the Express server and confirmed `public.html`/`auth.html`/`admin/index.html` are served, auth returns 401 without a token, and the public asset route responds. **Not verified end-to-end** — no local MongoDB instance was available in this environment (no `mongod`, Docker daemon not running), so the actual login → asset → issue → AI-triage → resolve flow needs to be exercised against a real Mongo before treating this as demo-ready.

**Cloudinary evidence upload — done:**
- Installed `cloudinary` + `multer`; added `backend/routes/upload.js` with `POST /api/upload` (internal, requires login) and `POST /api/upload/public` (no login — used by the public report form), both validating file type (image/video only) and size (15MB cap), uploading via `upload_stream` to avoid disk writes, returning `{ url }`.
- Mounted in `server.js`; added `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` placeholders to `.env` (**empty — you must fill these in with a real Cloudinary account before uploads will work**; until then the endpoint correctly responds `503 Media storage is not configured` instead of crashing).
- Wired a file input into `public.html`'s report form — uploads evidence before submitting the issue, degrades gracefully (skips evidence, still submits the report) if upload fails or storage isn't configured.
- Verified: started the server without Cloudinary credentials set, confirmed `POST /api/upload/public` returns the graceful 503 (not a crash) and `POST /api/upload` correctly requires a bearer token.
- **Not wired yet:** the internal technician-facing maintenance/issue UI in `admin/index.html` doesn't have a file input for evidence yet — only the public report form does. Add one to the maintenance-record and issue-assignment modals if evidence needs to be attachable from the internal side too.

**Internal technician evidence upload — done:**
- Added a file input to the Technician Workshop's "Submit Work Log" modal in `admin/index.html`; uploads via `POST /api/upload` (authenticated) before saving the maintenance record, with an "Uploading..." disabled-button state and graceful failure (continues without evidence rather than blocking the work-log submission).
- Added `evidence_url` to the `Maintenance` model (`backend/models/Maintenance.js`) so it actually persists.

**Critical-issue styling — verified, no change needed:** confirmed `Critical` priority already gets distinct red badge styling in all three ticket views (`IssuesPage`, Supervisor page, Technician page) — this requirement was already met.

**Found and fixed a pre-existing crash bug** (unrelated to my earlier changes, present in the original file): `admin/index.html`'s top-level `PageComponent` was passed a `setLogs` prop that referenced an undefined variable (should have been `setLogsState`) — a `ReferenceError` that crashed the entire React tree on every render once a real (or even fake/expired) JWT triggered the live-data code path. Root-caused it by temporarily instrumenting `window.onerror`/`unhandledrejection`, found the exact `ReferenceError: setLogs is not defined`, fixed the prop wiring, and removed the debug instrumentation. Verified: the dashboard now renders fully, and a deliberately invalid token correctly falls through to a 401 → auto-redirect to `auth.html` instead of a blank crashed page. **This means the dashboard was very likely unusable in its previously-committed state whenever it reached the "backend connected" code path** — worth noting for the incident record.

**Docker / CI / docs — done:**
- Added `Dockerfile` (project root, since `server.js` statically serves `index.html`/`auth.html`/`public.html`/`admin/` from the repo root, not just `backend/`), `.dockerignore`, and `docker-compose.yml` (backend + MongoDB, env vars passed through with sane defaults).
- Added `.github/workflows/ci.yml`: installs backend deps, syntax-checks every backend `.js` file, and builds the Docker image on push/PR to `main`.
- Added `API.md` — full endpoint reference (auth requirements, request/response shape, status state machine, validation rules) referenced from `README.md`. Updated `README.md`'s env-var section with the new `JWT_SECRET` hard-requirement and `CLOUDINARY_*` vars, plus a "Running with Docker" section.
- **Not verified**: Docker daemon wasn't running in this sandbox (confirmed via `docker version`), so the image build and compose stack were not actually executed — only syntax/structure-checked. Run `docker compose up --build` yourself to confirm before relying on it for submission.

**Internal AI-review-before-save UI — done:**
- The "Triage & Workflow Control" modal in `admin/index.html` (`IssuesPage`) now shows an explicit AI-suggestion panel above the editable fields when `ai_used` is set: the original reporter complaint, the AI's possible causes / diagnostic checks / recurring-pattern warning, and a note clarifying the title/category/priority fields below are pre-filled suggestions the admin/supervisor must review and can edit before saving.
- Verified: reloaded the app and confirmed no new render errors from this addition (couldn't click into a real ticket's modal to see it live, since no seeded issues exist without a working MongoDB in this sandbox — the JSX is syntactically sound and additive/conditional, gated behind `ai_used`, so it can't affect tickets that aren't AI-assisted).

**Still open:**
- Decide the `admin/src` Vite scaffold's fate (delete vs. adopt) — left untouched since deleting pre-existing files wasn't explicitly authorized; flagging for your decision rather than doing it silently.
- Full end-to-end verification still needs a real MongoDB instance (none available in this sandbox) — everything in this document was verified as far as static/runtime checks allow without one. **Before treating this as submission-ready, run it locally end-to-end**: start MongoDB, `npm install` + `npm start` in `backend/`, log in with a seeded account, register an asset, scan/open its QR → public page → report an issue with AI triage → assign → log work with evidence → resolve, and confirm the history timeline and dashboard stats update correctly.


Compared against `MaintainIQ_AI_Hackathon_Brief` (Track A – Advanced Full-Stack + GenAI).

## Architecture note
Two disconnected backends exist: the real one (`backend/server.js`, `backend/routes/*.js`, `backend/models/*.js` — Express + MongoDB, wired to `package.json`), and orphaned Python/FastAPI-style files (`backend/main.py`, `models.py`, `crud.py`, `schemas.py`, `database.py`, `ai_triage.py`) with no `requirements.txt` — dead scaffolding, not integrated. **Task 0: delete or clearly mark the Python files as unused.**

## Critical security issues (fix first)

1. **No auth/role middleware anywhere.** Every route in `assets.js`, `issues.js`, `maintenance.js`, `users.js` is open — no `Authorization` header check at all. Frontend-only role gating (`auth.html:495`, `localStorage.getItem('maintainiq_active_role')`) is trivially bypassed via devtools.
2. **Self-service admin signup.** `POST /api/auth/register` (`auth.js:21-39`) accepts a client-supplied `role` field with no restriction — anyone can register as Admin. `auth.html:350-361` even offers a role picker in the UI.
3. **Hardcoded JWT secret checked into repo.** `backend/.env:4` — `JWT_SECRET=maintainiq_jwt_super_secret_2026_production_key`. Also duplicated as a fallback default in `backend/routes/auth.js:6`, so a predictable secret ships even without `.env`. **Rotate and move to a real secret manager / gitignored env.**
4. **Unauthenticated destructive endpoint.** `server.js:57-71` exposes `/api/health/reset` with no auth guard — anyone can wipe the entire DB.

## Requirement-by-requirement status

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Auth + roles, backend-enforced | ❌ Broken | No middleware; open registration to any role |
| 2 | Asset CRUD/search/filter/unique code | ✅ Done | `assets.js` regex search (19-25), unique code gen w/ retry (6-13, 50-57) |
| 3 | QR generation/preview/download | ⚠️ Partial, broken | `QrCodes.jsx:12` renders from `MOCK.assets`, never fetches real assets; QR links to `/public/asset/:code` which **doesn't exist** in router or backend (404) |
| 4 | Public issue-reporting page (no login) | ❌ Not started | No public/unauthenticated route or page found anywhere |
| 5 | Issue reporting fields/unique #/status update | ⚠️ Partial | `Issue.js` model good, unique `issue_number` works (`issues.js:6-8,39-46`), status set to "Issue Reported" on create; but `evidence_url` is a plain string, no upload; no public submission path (depends on #4) |
| 6 | AI Issue Triage | ⚠️ Partial | `aiTriage.js` calls Gemini w/ heuristic fallback (9-41, 44-70); errors caught silently (78-85); `GEMINI_API_KEY` blank in `.env` so only heuristic path currently runs; human-review-before-save step not confirmed in `Issues.jsx` |
| 7 | Assignment & status-transition workflow | ⚠️ Partial, unguarded | `issues.js PUT /:id` (69-101) blindly applies any status with **no state-machine validation** — invalid jumps (e.g. Reported→Closed) and edits to Closed tickets are not blocked |
| 8 | Asset history timeline | ⚠️ Partial | `Log.js` + writes in assets/issues/maintenance routes exist; no update/delete route for logs (good), but immutability not explicitly enforced |
| 9 | Business rules (see breakdown) | ❌ Mostly not started | See below |
| 10 | Cloudinary/cloud media storage | ❌ Not started | Zero hits for "cloudinary"; no `multer`; `evidence_url` is a manually-pasted string, no upload endpoint |
| 11 | Responsive frontend + deployment | ⚠️ Partial | React 18 + Tailwind + Vite exists; no Dockerfile, no CI; `node_portable.zip` in repo root is an ad-hoc deploy hack, not a real pipeline |
| 12 | README/API docs/demo creds | ⚠️ Partial | README has setup + demo creds; **no API reference doc / Postman collection / OpenAPI spec** |
| 13 | Asset statuses (6-state enum + event mapping) | ⚠️ Partial | `Asset.js status` is a free string, no enum; only `Issue Reported`, `Under Maintenance`, `Operational` are ever set; **`Under Inspection`, `Out of Service`, `Retired` are never implemented** |

### Business rules breakdown (#9)
- Duplicate asset code rejected — ✅ done (`assets.js:56-58`)
- Negative maintenance cost rejected — ❌ not started (no `min:0` validator, no check in `maintenance.js`)
- Next service date ≥ completion date — ❌ not started
- Resolved requires a maintenance note — ❌ not started (`issues.js` PUT sets Resolved/Closed with no cross-check)
- Closed issue not editable until reopened — ❌ not started
- Critical issue visually distinct — data model supports it (`Issue.js:8` priority enum incl. Critical) but UI treatment unverified

## Task list (priority order)

**P0 — Security (do before anything else)**
1. Add JWT auth middleware; apply to all asset/issue/maintenance/user routes.
2. Restrict `role` on register to `Technician` only (or remove role from signup entirely); admin accounts created via seed script/existing-admin invite only.
3. Rotate `JWT_SECRET`, remove from repo, load from untracked `.env`; remove hardcoded fallback in `auth.js:6`.
4. Auth-guard or delete `/api/health/reset`.

**P1 — Core missing functionality**
5. Build the public asset page (`/public/asset/:code`) — safe fields only (name, code, category, location, condition, status, last/next service, recent safe activity, Report Issue button). No login.
6. Build public issue-reporting flow off that page, wired to the real `POST /api/issues` (not mock data).
7. Fix `QrCodes.jsx` to fetch real assets from the API instead of `MOCK.assets`.
8. Add asset status enum (`Operational, Issue Reported, Under Inspection, Under Maintenance, Out of Service, Retired`) to `Asset.js`, and implement the full event→status mapping table from the brief (inspection start, critical→Out of Service, retire action) — currently only 3 of 6 states are ever reached.
9. Add issue status state-machine validation in `issues.js PUT /:id` — block invalid transitions, block edits on Closed unless Reopened.
10. Enforce "resolved requires a maintenance note" check before allowing status→Resolved.
11. Add Cloudinary (or equivalent) upload endpoint + wire evidence uploads for issues/maintenance instead of raw URL strings.

**P2 — Business-rule validation**
12. Reject negative maintenance cost (schema `min:0` + route check).
13. Reject next-service-date earlier than maintenance completion date.
14. Confirm/implement "AI suggestion reviewed/edited before save" UI step in `Issues.jsx`.
15. Confirm Critical-priority issues are visually flagged in the UI (badge/color).

**P3 — Deployment & docs**
16. Add Dockerfile(s) for client/server (bonus points).
17. Add GitHub Actions CI (lint/build/test) (bonus points).
18. Write API reference doc or export a Postman collection.
19. Remove or clearly document the orphaned Python backend files.
20. Set `GEMINI_API_KEY` in a real (untracked) env for actual AI triage to run instead of falling back to heuristics.

**Nice-to-have (bonus, from brief §7 Advanced Bonus table)**
- AWS deployment, Redis caching, email notifications/OTP, rate limiting on public report/AI/auth endpoints, Socket.IO realtime status updates.
