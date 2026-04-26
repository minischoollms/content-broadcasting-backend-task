# Content Broadcasting System (Backend)

A Node.js + TypeScript + Express backend implementing the **Content Broadcasting
System** assignment. Teachers upload subject-based content, principals approve
or reject it, and students consume the approved content via a public,
time-aware, subject-rotating broadcast endpoint.

> Stack: **Node.js / TypeScript / Express / PostgreSQL (Supabase) / Supabase
> Storage / Redis / JWT / bcrypt / Joi / multer**.

---

## Features

| Requirement                               | Status |
|-------------------------------------------|--------|
| JWT auth + bcrypt password hashing        | ✅     |
| RBAC (`principal` / `teacher`)            | ✅     |
| Content upload (jpg/png/gif, ≤10MB)       | ✅     |
| Subject-based scheduling (start/end + rotation_minutes) | ✅ |
| Approval workflow with rejection reason   | ✅     |
| Public broadcast `GET /content/live/:teacherId` with rotation | ✅ |
| Edge cases (no content / not scheduled / invalid subject → empty) | ✅ |
| Folder structure (controllers/routes/services/middlewares/models/utils) | ✅ |
| **Bonus** — Redis caching of `/content/live`              | ✅     |
| **Bonus** — Rate limiting (Redis-backed) on public API    | ✅     |
| **Bonus** — Cloud storage (Supabase Storage in place of S3) | ✅     |
| **Bonus** — Subject-wise analytics + content view tracking | ✅     |
| **Bonus** — Pagination + filters (subject / status / teacher) | ✅ |

See [`architecture-notes.txt`](./architecture-notes.txt) for the full design
write-up (auth, RBAC, scheduling algorithm, scalability, etc).

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A Supabase project (free tier is fine) — used for both **Postgres** and
  **Storage**
- (Optional) Redis 6+ — required only for caching + rate limiting bonus

### 2. Clone & install
```bash
git clone <your-repo-url> content-broadcasting-system
cd content-broadcasting-system
npm install
```

### 3. Supabase setup
1. Create a new Supabase project.
2. From **Project Settings → Database** copy the **Connection string** (use the
   Session Pooler one for serverless, direct one for local).
3. From **Project Settings → API** copy the **Service role key** and
   **Project URL**.
4. In **Storage**, create a bucket named `content` (or whatever you set in
   `SUPABASE_STORAGE_BUCKET`). **Make it public**.

### 4. Configure env
```bash
cp .env.example .env
# fill in JWT_SECRET, DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# SUPABASE_STORAGE_BUCKET, REDIS_URL (optional)
```

### 5. Run migrations + seed default users
```bash
npm run migrate
npm run seed
```
Seed creates:
- `principal@example.com` / `Principal@123`
- `maths@example.com` / `Teacher@123`
- `science@example.com` / `Teacher@123`

### 6. Start the server
```bash
npm run dev      # tsx watch
# or
npm run build && npm start
```
The API is now at `http://localhost:4000/api`.
Swagger UI (when `openapi.json` is present): `http://localhost:4000/api/docs`.

---

## API Reference

All authenticated endpoints expect:
```
Authorization: Bearer <JWT>
```

### Auth — `/api/auth`
| Method | Path        | Body                                  | Description                |
|--------|-------------|----------------------------------------|----------------------------|
| POST   | `/register` | `{name, email, password, role}`        | Register a user            |
| POST   | `/login`    | `{email, password}`                    | Returns `{token, user}`    |
| GET    | `/me`       | —                                      | Current JWT payload        |

### Content (Teacher) — `/api/content`
| Method | Path        | Notes                                                       |
|--------|-------------|-------------------------------------------------------------|
| POST   | `/`         | `multipart/form-data`. Fields: `file`, `title`, `subject`, `description?`, `start_time?`, `end_time?`, `rotation_minutes?`. Status created as `pending`. |
| GET    | `/mine`     | List own content. Query: `status`, `subject`, `page`, `page_size`. |
| GET    | `/:id`      | Owner or principal can fetch.                                |
| DELETE | `/:id`      | Teacher deletes own content (cascades to schedule + views). |

### Approval (Principal) — `/api/principal`
| Method | Path                          | Body              | Description                       |
|--------|-------------------------------|-------------------|-----------------------------------|
| GET    | `/content`                    | —                 | All content. Query: `status`, `subject`, `uploaded_by`, `page`, `page_size`. |
| GET    | `/pending`                    | —                 | Quick list of pending content.   |
| POST   | `/content/:id/approve`        | —                 | Approve (clears prior rejection). |
| POST   | `/content/:id/reject`         | `{reason}`        | Reject with mandatory reason.     |

### Public Broadcast — `/api/content/live/:teacherId`
| Method | Path                                      | Description |
|--------|-------------------------------------------|-------------|
| GET    | `/api/content/live/:teacherId`            | Currently active content for this teacher, one slot per subject. |
| GET    | `/api/content/live/:teacherId?subject=maths` | Active content for this teacher in just that subject. |

Edge cases:
- No approved content → `{slots: [], message: "No content available"}`
- Approved but outside `[start_time, end_time]` → empty
- Unknown subject or teacher → empty (not an error)

Sample response:
```json
{
  "teacher": { "id": "...", "name": "Maths Teacher" },
  "served_at": "2026-04-26T14:00:00.000Z",
  "cached": false,
  "slots": [
    {
      "subject": "maths",
      "content": {
        "id": "...",
        "title": "Algebra worksheet",
        "subject": "maths",
        "file_url": "https://...supabase.co/storage/v1/object/public/content/...",
        "file_type": "image/png",
        "start_time": "2026-04-26T13:00:00.000Z",
        "end_time": "2026-04-26T18:00:00.000Z"
      },
      "rotation": {
        "index_in_cycle": 0,
        "total_in_rotation": 3,
        "cycle_length_seconds": 900,
        "elapsed_seconds": 60,
        "next_rotation_at": "2026-04-26T14:04:00.000Z"
      }
    }
  ]
}
```

### Analytics (Principal) — `/api/analytics`
| Method | Path        | Description                              |
|--------|-------------|------------------------------------------|
| GET    | `/overview` | Top subjects + top viewed content. `?limit=N`. |

---

## Scheduling — How rotation actually works

Concrete example. Teacher `T` uploads to `maths`:
- Content A — start 13:00, end 18:00, rotation 5 min
- Content B — start 13:00, end 18:00, rotation 5 min
- Content C — start 13:00, end 18:00, rotation 5 min

At wall-clock `now`:
1. Filter to approved + currently in window → `[A, B, C]`
2. Anchor = earliest start = 13:00. Cycle = 5+5+5 = 15 min.
3. `elapsed = (now - 13:00) % 15 min` → which of A/B/C is active.
4. The same teacher could have `science` content with its own independent cycle
   running in parallel; the response contains both subjects' active items.

Invalidate cache on upload / approve / reject / delete so the public endpoint
always reflects the latest pool.

See `src/utils/scheduler.ts` and `architecture-notes.txt § 7` for the algorithm.

---

## Postman collection

A ready-to-import collection lives at
[`postman_collection.json`](./postman_collection.json). Set the
`baseUrl` and `token` collection variables and you're set.

---

## Project Layout

```
src/
  config/         env, db pool, redis, supabase storage
  controllers/    HTTP layer (parse + delegate)
  routes/         Express routers, mounted under /api
  services/       business logic
  models/         Postgres data access (parameterised SQL)
  middlewares/    auth, rbac, multer, validate, rate limit, error
  utils/          jwt, password, scheduler, cache, ApiError, asyncHandler
  db/             schema.sql + migrate + seed scripts
  types/          Express.Request augmentation
```

---

## Assumptions & Skipped Items

- `/auth/register` accepts `role` directly so demo onboarding is one step. In
  production, principal provisioning should be admin-only.
- Supabase Storage bucket is **public-read**. Switch to signed URLs if you
  need authenticated downloads.
- `start_time` and `end_time` are validated as a pair: both required or both
  absent. Without them content is `pending` but never broadcast (matches spec).
- Tests are not included — the assignment doesn't require them, and the
  scheduler's logic is deterministic and easy to verify by hitting the API.

---

## Scripts

| Script       | What                                       |
|--------------|--------------------------------------------|
| `npm run dev`     | Watch mode (tsx)                       |
| `npm run build`   | Compile to `dist/`                     |
| `npm start`       | Run compiled JS                        |
| `npm run migrate` | Apply `src/db/schema.sql`              |
| `npm run seed`    | Insert default principal + 2 teachers + slots |
| `npm run typecheck` | `tsc --noEmit`                       |

---

## Deployment notes

- Use the **Session Pooler** Supabase connection string for serverless
  platforms (Vercel/Netlify). Use the direct one for long-lived servers.
- Set `JWT_SECRET` to a strong random string.
- Provision a managed Redis (Upstash, Redis Cloud) and set `REDIS_URL` or set
  `REDIS_ENABLED=false` to disable caching/rate limiting.
- The app trusts `X-Forwarded-For` (`app.set('trust proxy', 1)`) so rate
  limiting works behind a single proxy hop. Increase the value for deeper
  proxy chains.
