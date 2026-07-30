# Backend Planning — To-Let (Flat Rental Marketplace)

## 1. Project Summary

**Problem Statement:** Finding a rental flat in Bangladesh typically relies on word-of-mouth, local brokers (dalals often charging a month's rent as commission), or scattered Facebook groups with no structured filtering. Landlords have no easy way to list vacant flats with structured details (price, size, rooms, location), and tenants can't search/filter/compare listings in one place or get guidance on what fits their budget and preferred area.

**Solution:** A two-sided marketplace where landlords list flats with structured attributes (price, sq ft, bedrooms, bathrooms, location) and tenants search/filter/browse listings — with an AI layer that recommends flats matching a user's stated budget and preferred location/area, even when their query is loose ("around 15k in Chattogram near IIUC").

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens) |
| Password Hashing | bcrypt |
| Validation | Zod |
| Rate Limiting | express-rate-limit (+ Redis store) |
| Logging | Winston + morgan |
| File/Image Upload | Multer + Cloudinary (or S3-compatible storage) for flat photos |
| Geolocation | PostGIS extension (or lat/lng columns + bounding-box queries) |
| AI Integration | Gemini/OpenAI API — recommendation & natural-language search |
| API Docs | swagger-jsdoc + swagger-ui-express |
| Testing | Jest + Supertest |
| Deployment | Render/Railway (backend), Neon/Supabase (Postgres) |

---

## 3. High-Level Architecture

```
Client (React.js)
      │
      ▼
Express API
 ├── Auth Middleware (JWT verify + role check)
 ├── Rate Limiter Middleware
 ├── Validation Middleware
 │
 ├── /auth          → Auth Controller
 ├── /listings       → Listing Controller (CRUD, search/filter/pagination)
 ├── /users          → User/Profile Controller
 ├── /favorites      → Favorites/Saved-listings Controller
 ├── /inquiries       → Tenant-Landlord contact/inquiry Controller
 ├── /reviews        → Flat/Landlord review Controller (optional)
 ├── /ai             → AI Recommendation Controller  → AI Service (Gemini/OpenAI)
 ├── /uploads        → Image upload handling (Multer → Cloudinary)
 │
 ▼
PostgreSQL (via Prisma, PostGIS for geo queries)
      │
      ▼
Redis (rate-limit store, cache for popular search queries)
```

---

## 4. Database Schema (PostgreSQL — normalized)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR | |
| email | VARCHAR UNIQUE | |
| phone | VARCHAR | contact for inquiries |
| password_hash | VARCHAR | bcrypt |
| role | ENUM('tenant','landlord','admin') | default 'tenant' |
| is_verified | BOOLEAN | email/phone verification |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `refresh_tokens`
| id | UUID PK |
| user_id | FK → users.id |
| token_hash | VARCHAR |
| expires_at | TIMESTAMP |
| revoked | BOOLEAN |

### `listings`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| landlord_id | FK → users.id | |
| title | VARCHAR | |
| description | TEXT | |
| price | NUMERIC | monthly rent |
| size_sqft | NUMERIC | |
| bedrooms | INT | |
| bathrooms | INT | |
| floor_number | INT | nullable |
| address | VARCHAR | full text address |
| area | VARCHAR | e.g. "Panchlaish", "Khulshi" — for filtering |
| city | VARCHAR | |
| latitude | NUMERIC | |
| longitude | NUMERIC | |
| amenities | VARCHAR[] | e.g. lift, generator, parking, gas |
| status | ENUM('available','rented','inactive') | default 'available' |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `listing_images`
| id | UUID PK |
| listing_id | FK → listings.id |
| image_url | VARCHAR |
| is_primary | BOOLEAN |
| order_index | INT |

### `favorites` (saved listings)
| id | UUID PK |
| user_id | FK → users.id |
| listing_id | FK → listings.id |
| created_at | TIMESTAMP |

> Unique constraint on (`user_id`, `listing_id`).

### `inquiries`
| id | UUID PK |
| listing_id | FK → listings.id |
| tenant_id | FK → users.id |
| message | TEXT |
| status | ENUM('pending','responded','closed') |
| created_at | TIMESTAMP |

### `reviews` (optional — landlord/flat trust signal)
| id | UUID PK |
| listing_id | FK → listings.id |
| tenant_id | FK → users.id |
| rating | INT (1-5) |
| comment | TEXT |
| created_at | TIMESTAMP |

### `ai_search_logs` (optional — improve recommendations over time)
| id | UUID PK |
| user_id | FK → users.id (nullable for anonymous) |
| query_text | TEXT | raw natural-language query |
| parsed_filters | JSONB | budget, location, bedrooms extracted by AI |
| created_at | TIMESTAMP |

**Indexes:**
- `listings(city, area)`, `listings(price)`, `listings(bedrooms, bathrooms)`, `listings(status)`
- Composite index on `(latitude, longitude)` or PostGIS GIST index if using geo queries
- GIN index on `listings(amenities)` if array-based
- `favorites(user_id)`, `inquiries(listing_id)`

---

## 5. REST API Endpoints

### Auth
```
POST   /api/auth/register            (role: tenant | landlord)
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### Listings
```
GET    /api/listings                 ?page=&limit=&minPrice=&maxPrice=&bedrooms=&bathrooms=&area=&city=&sort=
GET    /api/listings/:id
POST   /api/listings                 (landlord only)
PUT    /api/listings/:id             (landlord — owner only)
DELETE /api/listings/:id             (landlord — owner only, or admin)
PATCH  /api/listings/:id/status      (mark rented/available)
GET    /api/listings/landlord/:landlordId   (all listings by a landlord)
```

### Listing Images
```
POST   /api/listings/:id/images      (upload, landlord — owner only)
DELETE /api/listings/:id/images/:imageId
```

### Favorites
```
POST   /api/favorites                (tenant)
GET    /api/favorites                (tenant's saved listings)
DELETE /api/favorites/:id
```

### Inquiries
```
POST   /api/inquiries                (tenant contacts landlord about a listing)
GET    /api/inquiries/sent           (tenant view)
GET    /api/inquiries/received       (landlord view)
PATCH  /api/inquiries/:id/status     (landlord updates status)
```

### Reviews
```
POST   /api/reviews                  (tenant, after inquiry/rental)
GET    /api/reviews/listing/:listingId
```

### AI Recommendation
```
POST   /api/ai/recommend             { query: "flat under 15k in Panchlaish, 2 beds" }
                                      → parses natural language into filters, returns ranked listings
GET    /api/ai/similar/:listingId    → "similar flats" suggestions
```

### Users
```
GET    /api/users/:id
PATCH  /api/users/:id
GET    /api/users/:id/listings       (if landlord)
```

---

## 6. Authentication & Authorization

- **JWT access token** (15 min) + **refresh token** (7 days, httpOnly cookie, hashed in DB).
- **Roles:** `tenant`, `landlord`, `admin`.
- **Middleware:**
  - `authenticate` — verifies token, attaches `req.user`.
  - `authorize(...roles)` — restricts listing creation to landlords, admin routes to admins.
  - `isOwner` — custom middleware checking `listing.landlord_id === req.user.id` before allowing update/delete (prevents a landlord editing someone else's listing).
- Password hashing via bcrypt, min 10 salt rounds.
- Optional phone/email verification (OTP) before a landlord can publish listings — reduces fake/spam listings.

---

## 7. Middleware Stack (execution order)

1. `helmet()` — security headers
2. `cors()` — restrict to frontend origin
3. `express.json()` — body parsing
4. `morgan` → piped to Winston logger
5. Global rate limiter (100 req/15min per IP)
6. Stricter limiter on `/auth/*` and `/inquiries` (prevent spam contact requests / brute-force login)
7. Route-level `authenticate` / `authorize(role)` / `isOwner`
8. Zod validation middleware per route
9. Route handler
10. Centralized error handler (last) — consistent JSON error shape

---

## 8. Input Validation & Security

- All bodies/params/query validated via Zod (e.g. price must be positive number, bedrooms/bathrooms integer range 0–10, coordinates within valid lat/lng bounds).
- Prisma parameterized queries — no raw SQL concatenation (SQL injection protection).
- CORS whitelist limited to deployed frontend origin.
- Rate limit tiers:
  - Auth endpoints: 5 req/min per IP
  - Inquiry creation: limited per tenant per day (prevent spam to landlords)
  - AI recommendation endpoint: rate-limited per user (cost control on LLM calls)
- Image upload: validate file type/size (Multer file filter), scan dimensions, store only in Cloudinary/S3 — never trust raw file paths from client.
- `isOwner` checks on every listing mutation — never rely on frontend hiding edit/delete buttons.

---

## 9. AI Integration — Recommendation & Natural-Language Search

**Flow:**
1. Tenant enters a free-text query (e.g. *"2 bed flat under 15000 near IIUC"*) via `POST /api/ai/recommend`.
2. Backend sends the query to the AI service (Gemini/OpenAI) with a structured prompt asking it to extract: `maxPrice`, `minBedrooms`, `area/location keywords`, `amenities mentioned`.
3. AI returns structured JSON (e.g. `{ maxPrice: 15000, bedrooms: 2, area: "IIUC" }`).
4. Backend runs this as a normal Prisma filter query against `listings` (price ≤ maxPrice, bedrooms ≥ minBedrooms, area ILIKE match or geo-radius near IIUC's coordinates).
5. Results ranked and returned — AI is used for **query understanding**, not for inventing listings; actual data always comes from PostgreSQL.
6. Log the raw query + parsed filters to `ai_search_logs` (optional) to analyze common search patterns later.

**`GET /api/ai/similar/:listingId`** — given a listing, find others with close price range, same area, similar bedroom count (can be plain SQL similarity ranking, or AI-assisted embedding similarity if scope allows).

**Cost/reliability guardrails:**
- Always validate the AI's parsed filters (e.g. clamp negative/absurd prices) before running the DB query — never trust the LLM output blindly.
- Fallback to keyword-based search if the AI call fails or times out, so the core search feature doesn't depend on AI uptime.
- Rate-limit this endpoint separately since LLM calls cost more than a normal DB query.

---

## 9a. AI Module — Folder Structure

```
src/modules/ai/
├── ai.controller.ts       # handles POST /api/ai/recommend, GET /api/ai/similar/:listingId
├── ai.service.ts          # calls Gemini/OpenAI, sends prompt, gets parsed filters back
├── ai.routes.ts           # route definitions, mounted under /api/ai
├── ai.schema.ts           # Zod schema validating the incoming { query: string } body
├── ai.types.ts            # TS types for parsed filters (maxPrice, bedrooms, area, etc.)
├── prompts.ts             # prompt template(s) instructing the model to return structured JSON
└── fallbackSearch.ts      # plain keyword/price search used if the AI call fails or times out
```

**Flow through these files:**
1. `ai.routes.ts` → `ai.controller.ts` receives `{ query }`.
2. `ai.controller.ts` calls `ai.service.ts`, which sends the query to Gemini/OpenAI using a template from `prompts.ts`.
3. `ai.service.ts` parses the model's JSON response into the shape defined in `ai.types.ts`, validating/clamping values (no negative price, no absurd bedroom count).
4. Controller passes the parsed filters into `listings/listing.filters.ts` (from the listings module) to run the actual Prisma query — the AI module never queries the DB directly, it only produces filters.
5. If step 2/3 fails or times out, `fallbackSearch.ts` runs a plain `ILIKE`/price-range match instead, so the endpoint still returns results.

---

## 10. Error Handling & Logging

- Centralized error middleware, consistent shape:
  ```json
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
  ```
- `AppError` class distinguishes operational (4xx) vs unexpected (5xx) errors.
- Winston logs: request logs, error logs with stack traces, separate log channel for AI service failures/timeouts.
- No raw DB/stack traces leaked to client in production.

---

## 11. API Documentation

- OpenAPI spec via `swagger-jsdoc`, served at `/api/docs`.
- Document all listing filter query params clearly (this API has many optional filters — price range, bedrooms, bathrooms, area, city, sort) since that's the most-used endpoint.

---

## 12. Testing Strategy

- **Unit tests:** Zod schemas, price/filter parsing helpers, `isOwner` authorization logic, AI response parser/validator.
- **Integration tests (Supertest):**
  - Auth flow (register as tenant/landlord, login, refresh)
  - Listing CRUD with ownership enforcement (landlord A cannot edit landlord B's listing)
  - Search/filter/pagination correctness (price range, bedroom filters)
  - Favorites add/remove
  - Inquiry creation + rate limiting
  - AI recommend endpoint — mock the AI API call, verify fallback behavior on failure
- Separate seeded test database.

---

## 13. Suggested Build Order (Backend)

1. Project scaffold (TypeScript + Express) + Prisma schema/migrations
2. Auth module (register with role selection, login, refresh, JWT middleware, `isOwner` helper)
3. Listings CRUD (landlord create/update/delete + public browse)
4. Listing images upload (Multer → Cloudinary)
5. Search/filter/pagination on listings (price, bedrooms, bathrooms, area, city)
6. Favorites module
7. Inquiries module (tenant → landlord contact flow)
8. AI recommendation endpoint (prompt design, filter parsing, fallback logic)
9. Reviews module (optional, if time permits)
10. Rate limiting, security hardening (helmet, CORS, ownership checks)
11. Swagger API docs
12. Test suite (unit + integration)
13. Deployment config (env vars, image storage credentials, CI)
Backend Folder Structure (TypeScript) — To-Let Flat Rental Platform
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                    # loads & validates process.env (zod schema)
│   │   ├── db.ts                     # Prisma client instance
│   │   ├── redis.ts                  # Redis connection (rate-limit store, caching)
│   │   ├── cloudinary.ts             # Cloudinary/S3 config for listing images
│   │   ├── logger.ts                 # Winston setup
│   │   └── ai.ts                     # Gemini/OpenAI client config
│   │
│   ├── middleware/
│   │   ├── auth.ts                   # authenticate + authorize(...roles)
│   │   ├── isOwner.ts                # checks listing.landlord_id === req.user.id
│   │   ├── rateLimiter.ts            # global + route-specific limiters
│   │   ├── validate.ts               # generic Zod validation middleware
│   │   ├── upload.ts                 # Multer config (file type/size validation)
│   │   ├── errorHandler.ts           # centralized error-handling middleware
│   │   └── notFound.ts               # 404 handler
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.schema.ts
│   │   │   └── user.types.ts
│   │   │
│   │   ├── listings/
│   │   │   ├── listing.controller.ts
│   │   │   ├── listing.service.ts
│   │   │   ├── listing.routes.ts
│   │   │   ├── listing.schema.ts     # Zod: price, sqft, bedrooms/bathrooms ranges
│   │   │   ├── listing.types.ts
│   │   │   └── listing.filters.ts    # query-param → Prisma where-clause builder
│   │   │
│   │   ├── listingImages/
│   │   │   ├── image.controller.ts
│   │   │   ├── image.service.ts      # upload to Cloudinary, save URL
│   │   │   └── image.routes.ts
│   │   │
│   │   ├── favorites/
│   │   │   ├── favorite.controller.ts
│   │   │   ├── favorite.service.ts
│   │   │   ├── favorite.routes.ts
│   │   │   └── favorite.types.ts
│   │   │
│   │   ├── inquiries/
│   │   │   ├── inquiry.controller.ts
│   │   │   ├── inquiry.service.ts
│   │   │   ├── inquiry.routes.ts
│   │   │   ├── inquiry.schema.ts
│   │   │   └── inquiry.types.ts
│   │   │
│   │   ├── reviews/
│   │   │   ├── review.controller.ts
│   │   │   ├── review.service.ts
│   │   │   ├── review.routes.ts
│   │   │   └── review.schema.ts
│   │   │
│   │   └── ai/
│   │       ├── ai.controller.ts
│   │       ├── ai.service.ts         # Gemini/OpenAI call + response parsing
│   │       ├── ai.routes.ts
│   │       ├── ai.schema.ts
│   │       ├── ai.types.ts
│   │       ├── prompts.ts            # prompt templates for query parsing
│   │       └── fallbackSearch.ts     # plain keyword search if AI call fails
│   │
│   ├── utils/
│   │   ├── AppError.ts               # custom operational error class
│   │   ├── asyncHandler.ts           # wraps async route handlers
│   │   ├── jwt.ts                    # sign/verify token helpers
│   │   ├── hash.ts                   # bcrypt helpers
│   │   ├── apiResponse.ts            # consistent success/error response shape
│   │   ├── pagination.ts             # shared pagination helper
│   │   └── geo.ts                    # distance calc / bounding-box helpers for location search
│   │
│   ├── types/
│   │   ├── express.d.ts              # extends Express Request with `user`
│   │   └── global.d.ts
│   │
│   ├── docs/
│   │   └── swagger.ts                # swagger-jsdoc + swagger-ui-express setup
│   │
│   ├── routes/
│   │   └── index.ts                  # mounts all module routers under /api
│   │
│   ├── app.ts                        # express app setup (middleware chain, routes)
│   └── server.ts                     # entrypoint — starts HTTP server, connects DB/Redis
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                       # sample landlords/listings for local dev
│
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   └── services/
│   │       └── ai.service.test.ts    # mocked AI parsing response tests
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── listings.test.ts          # includes isOwner enforcement tests
│   │   ├── favorites.test.ts
│   │   ├── inquiries.test.ts
│   │   └── ai.test.ts                # mocked AI call + fallback behavior
│   └── setup.ts                      # test DB setup/teardown
│
├── .env
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── jest.config.ts
├── Dockerfile
├── docker-compose.yml                # app + postgres + redis for local dev
├── package.json
└── README.md