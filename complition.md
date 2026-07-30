# To-Let — Completion Notes

## Project Setup
- TypeScript/Express.js backend with ESM (`"type": "module"`)
- `package.json` merged from old project template — name `to-let-backend`, description "Flat Rental Marketplace Backend"
- Dependencies: express, prisma, pg, bcryptjs, jsonwebtoken, cookie-parser, zod, helmet, cors, morgan, winston, dotenv, express-rate-limit, multer, cloudinary, openai, @google/generative-ai, groq-sdk, stripe, sslcommerz-lts, firebase-admin, nodemailer, swagger-jsdoc, swagger-ui-express, etc.

## Infrastructure

| File | Purpose |
|------|---------|
| `src/server.ts` | Entrypoint — connects Prisma, starts Express on port 3000 |
| `src/app.ts` | Express app — middleware stack: helmet → cors → json → cookieParser → morgan → swagger docs → routes → notFound → errorHandler |
| `src/lib/prisma.ts` | PrismaClient singleton with `@prisma/adapter-pg` |
| `src/routes/index.ts` | Mounts all module routers under `/api` |
| `src/config/cloudinary.ts` | Cloudinary SDK config |

## Prisma Schema (`prisma/schema/`)

10 model files covering the full schema from planning.md:

| File | Model | Key features |
|------|-------|-------------|
| `schema.prisma` | Generator + datasource (PostgreSQL) |
| `enum.prisma` | `UserRole` (TENANT/LANDLORD/ADMIN), `ListingStatus` (AVAILABLE/RENTED/INACTIVE), `InquiryStatus` (PENDING/RESPONDED/CLOSED) |
| `user.prisma` | `User` | UUID PK, unique email, role, password_hash, is_verified, relations to all modules |
| `refreshToken.prisma` | `RefreshToken` | token_hash, expires_at, revoked |
| `listing.prisma` | `Listing` | price, size_sqft, bedrooms, bathrooms, floor_number, lat/lng, amenities[], status; indexes on city+area, price, bedrooms+bathrooms, status, lat+lng, GIN on amenities |
| `listingImage.prisma` | `ListingImage` | image_url, is_primary, order_index |
| `favorite.prisma` | `Favorite` | `@@unique([userId, listingId])` |
| `inquiry.prisma` | `Inquiry` | message, status |
| `review.prisma` | `Review` | rating (1-5), comment |
| `aiSearchLog.prisma` | `AiSearchLog` | query_text, parsed_filters (JsonB) |

One initial migration (`20260729214052_init`) with all tables.

## Modules Built

### Auth (`/api/auth`)
| Method | Path | Auth | Rate limit | Description |
|--------|------|------|------------|-------------|
| POST | `/api/auth/register` | No | 5/min | Register (name, email, phone, password, role) |
| POST | `/api/auth/login` | No | 5/min | Login, returns access token + refreshToken cookie |
| POST | `/api/auth/logout` | Bearer | — | Revokes refresh token, clears cookie |
| POST | `/api/auth/refresh` | Cookie | 5/min | Rotates refresh token, issues new access token |
| GET | `/api/auth/me` | Bearer | — | Current user profile |

Files: `auth.controller.ts`, `auth.service.ts`, `auth.routes.ts`, `auth.schema.ts`, `auth.types.ts`

### Listings (`/api/listings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/listings` | Public | Paginated, filtered (price, beds, baths, area, city, status, sort) |
| POST | `/api/listings` | Landlord | Create listing |
| GET | `/api/listings/:id` | Public | Get single listing |
| PUT | `/api/listings/:id` | Landlord (owner) | Update listing |
| DELETE | `/api/listings/:id` | Landlord (owner) | Delete listing |
| PATCH | `/api/listings/:id/status` | Landlord (owner) | Change status (AVAILABLE/RENTED/INACTIVE) |
| GET | `/api/listings/landlord/:landlordId` | Public | All listings by a landlord |

Files: `listing.controller.ts`, `listing.service.ts`, `listing.routes.ts`, `listing.schema.ts`, `listing.types.ts`, `listing.filters.ts`

### Listing Images (`/api/listings/:id/images`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/listings/:id/images` | Landlord (owner) | Upload image (multipart, validates type/size) |
| DELETE | `/api/listings/:id/images/:imageId` | Landlord (owner) | Delete image from Cloudinary + DB |

Files: `image.controller.ts`, `image.service.ts`, `image.routes.ts`

### Favorites (`/api/favorites`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/favorites` | Tenant | Save a listing (unique constraint) |
| GET | `/api/favorites` | Tenant | Paginated saved listings |
| DELETE | `/api/favorites/:id` | Tenant | Remove favorite (owner only) |

Files: `favorite.controller.ts`, `favorite.service.ts`, `favorite.routes.ts`, `favorite.schema.ts`

### Inquiries (`/api/inquiries`)
| Method | Path | Auth | Rate limit | Description |
|--------|------|------|------------|-------------|
| POST | `/api/inquiries` | Tenant | 10/min + 5/day | Send inquiry about a listing |
| GET | `/api/inquiries/sent` | Tenant | — | Tenant's sent inquiries |
| GET | `/api/inquiries/received` | Landlord | — | Inquiries on landlord's listings |
| PATCH | `/api/inquiries/:id/status` | Landlord | — | Update status (PENDING/RESPONDED/CLOSED) |

Files: `inquiry.controller.ts`, `inquiry.service.ts`, `inquiry.routes.ts`, `inquiry.schema.ts`

### Reviews (`/api/reviews`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/reviews` | Tenant | Create review (listingId, rating 1-5, comment) |
| GET | `/api/reviews/listing/:listingId` | Public | All reviews for a listing |

Files: `review.controller.ts`, `review.service.ts`, `review.routes.ts`, `review.schema.ts`

### AI (`/api/ai`)
| Method | Path | Limit | Description |
|--------|------|-------|-------------|
| POST | `/api/ai/recommend` | 10/min | Natural language → AI parses → Prisma query; fallbackSearch on failure |
| GET | `/api/ai/similar/:listingId` | — | ±30% price, same area, ±1 bedroom |

Files: `ai.controller.ts`, `ai.service.ts`, `ai.routes.ts`, `ai.schema.ts`, `ai.types.ts`, `prompts.ts`, `fallbackSearch.ts`

**AI flow:** Gemini parses query → `ParsedFilters` (maxPrice, minBedrooms, area, amenities) → clamped → `buildWhereClause()` → Prisma query. Falls back to keyword search if AI fails/times out/returns empty.

## Middleware

| File | Purpose |
|------|---------|
| `auth.ts` | `authenticate` (JWT verify) + `authorize(...roles)` |
| `validate.ts` | Generic Zod validation (body/query/params) |
| `isOwner.ts` | Checks `listing.landlordId === req.user.id`, returns 403 |
| `rateLimiter.ts` | Shared tiers: `authLimiter` (5/min), `inquiryLimiter` (10/min), `aiLimiter` (10/min) |
| `upload.ts` | Multer — memory storage, whitelist JPEG/PNG/GIF/WebP, 5MB limit |
| `errorHandler.ts` | AppError-aware, consistent JSON error shape |
| `notFound.ts` | 404 handler |

## Config

| File | Purpose |
|------|---------|
| `src/config/cloudinary.ts` | Cloudinary v2 config from env vars |

## Utilities

| File | Purpose |
|------|---------|
| `jwt.ts` | `generateAccessToken()` / `verifyAccessToken()` |
| `hash.ts` | `hashPassword()`, `comparePassword()`, `hashToken()` (SHA-256 for refresh tokens) |
| `asyncHandler.ts` | Wraps async route handlers, forwards errors |
| `AppError.ts` | Custom error class (statusCode, code, message) |
| `apiResponse.ts` | `success()` and `fail()` response helpers |

## API Documentation

- Swagger UI served at `GET /api/docs` (OpenAPI 3.0)
- All route files annotated with `@swagger` JSDoc blocks
- Components: `Error`, `Pagination` schemas; `bearerAuth` security scheme

## Security & Rate Limiting

- **CORS** — restricted to `CLIENT_URL` / `FRONTEND_URL` env vars, falls back to `localhost:5173` for dev
- **Helmet** — security headers with `crossOriginResourcePolicy: "cross-origin"`
- **Auth endpoints** — 5 req/min
- **Inquiry creation** — 10 req/min + service-level 5 inquiries/day per tenant
- **AI recommend** — 10 req/min (cost control on LLM calls)
- **Image upload** — file type/size validated by Multer
- **Ownership** — `isOwner` middleware on all listing mutations

## Remaining (from planning.md)

- [ ] Forgot password / reset password endpoints (`/api/auth/forgot-password`, `/api/auth/reset-password`)
- [ ] Users module (`/api/users/:id`, PATCH, listing by user)
- [ ] Search/filter geo-radius queries (PostGIS)
- [ ] AI search logging (`ai_search_logs` table exists, not wired)
- [ ] Global rate limiter (100 req/15min per IP)
- [ ] Winston logger setup (morgan is active, winston not wired)
- [ ] Redis integration (rate-limit store, caching)
- [ ] SSLCommerz / Stripe payment integration
- [ ] Tests (Jest + Supertest configured, no tests written)
- [ ] Deployment config (Dockerfile, CI, env template)
- [ ] Seed script (`prisma/seed.ts` not created)
