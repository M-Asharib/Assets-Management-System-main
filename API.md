# MaintainIQ API Reference

Base URL (local): `http://localhost:5000`

Authenticated routes require `Authorization: Bearer <token>`, obtained from `POST /api/auth/login`.

## Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register` | none | `{ username, password, full_name? }` | Always creates a `Technician` account. Admin/Supervisor accounts are created via `POST /api/users`. |
| POST | `/api/auth/login` | none | `{ username, password }` | Returns `{ token, user }`. |
| GET  | `/api/auth/me` | Bearer | — | Returns the current user. |

## Assets

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/assets` | Bearer | Query: `q`, `category`, `status`, `skip`, `limit`. Returns array + `X-Total-Count` header. |
| GET | `/api/assets/:id` | Bearer | |
| POST | `/api/assets` | Bearer, Admin | Rejects duplicate `asset_code`. Auto-generates a code if none supplied. |
| PUT | `/api/assets/:id` | Bearer, Admin | |
| DELETE | `/api/assets/:id` | Bearer, Admin | |

Asset `status` enum: `Operational`, `Issue Reported`, `Under Inspection`, `Under Maintenance`, `Out of Service`, `Retired`.

## Public asset page (no login)

| Method | Path | Notes |
|---|---|---|
| GET | `/public/asset/:code` | Returns safe fields only (name, category, location, condition, status, service dates, last 5 activity entries). 404 if not found. `retired: true` if the asset's status is `Retired`. |

## Issues

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/issues` | Bearer | Query: `asset_id`, `technician_id`, `status`. |
| GET | `/api/issues/:id` | Bearer | |
| POST | `/api/issues` | none (public reporting) | Body: `{ asset_id \| asset_code, title, description, priority, category, reporter_name, reporter_contact, evidence_url?, ai_* fields }`. Sets the asset to `Issue Reported`. Rejects if the asset is `Retired`. |
| PUT | `/api/issues/:id` | Bearer | Technicians may only update issues assigned to them. Enforces the status state machine (see below), blocks edits on `Closed` issues until `Reopened`, and requires an existing maintenance note before allowing `Resolved`. |

Issue status transitions (`Reported → Assigned → Inspection Started → {Maintenance In Progress ⇄ Waiting for Parts} → Resolved → {Closed, Reopened}`; `Closed → Reopened`; `Reopened → {Assigned, Inspection Started}`).

## AI Issue Triage

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/ai-triage` | none | Body: `{ complaint, asset? }`. Uses Gemini if `GEMINI_API_KEY` is set, otherwise a local heuristic. Returns `{ title, category, priority, possible_causes[], diagnostic_checks[], pattern_warning }`. Advisory only — review before saving. |

## Maintenance

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/maintenance` | Bearer | Query: `asset_id`. |
| GET | `/api/maintenance/:id` | Bearer | |
| POST | `/api/maintenance` | Bearer | Rejects negative `cost`; rejects `next_service_date` earlier than `end_date`. Sets the asset to `Under Maintenance` if `status: 'In Progress'`. |
| PUT | `/api/maintenance/:id` | Bearer | Same validation as POST. |

## Evidence upload (Cloudinary)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/upload` | Bearer | `multipart/form-data`, field `file`. Internal (technician/admin) evidence upload. |
| POST | `/api/upload/public` | none | Same, for the public issue-report form. |

Both: images (jpeg/png/gif/webp) or video (mp4/mov/webm), 15MB max. Returns `{ url }`. Returns `503` if Cloudinary credentials aren't configured.

## Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/users` | Bearer, Admin | |
| GET | `/api/technicians` | Bearer | Users with `role: 'Technician'`. |
| POST | `/api/users` | Bearer, Admin | Creates any role (Admin/Technician/Supervisor). |
| DELETE | `/api/users/:id` | Bearer, Admin | |

## Meta / Dashboard

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/categories` | Bearer | Distinct asset categories. |
| GET | `/api/locations` | Bearer | Distinct asset locations. |
| GET | `/api/stats` | Bearer | Dashboard summary: totals, status/priority/category distributions. |
| GET | `/api/logs` | Bearer | Query: `asset_id`. Newest first, capped at 200. |
| POST | `/api/logs` | Bearer | Manual log entry. |

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | none | `{ status, database, timestamp }`. |
| POST | `/api/health/reset` | Bearer, Admin | Destructive — wipes and reseeds the database. |
