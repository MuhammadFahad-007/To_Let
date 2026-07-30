# AGENTS.md

## Project

TypeScript/Express.js backend (ESM, `"type": "module"`). Prisma ORM v7 connected to PostgreSQL via `@prisma/adapter-pg`.

## Prisma v7 quirks

- Uses `prisma.config.ts` with `defineConfig`, **not** a root `schema.prisma`. Schema dir is `prisma/schema` (currently missing — no `.prisma` files exist, but generated client is present).
- Generated client lives at `generated/prisma/client` — **gitignored**, run `npx prisma generate` after schema changes.
- `prisma.config.ts` loads `dotenv/config`, so `.env` is available during Prisma CLI commands.
- Run: `npx prisma generate`, `npx prisma migrate dev`, `npx prisma db push`, `npx prisma studio`.

## Running code

- `npx tsx src/<file>.ts` — runs TS files (ESM, no build step needed).
- No build/lint/test/typecheck scripts in `package.json`. No test runner configured.

## Source layout

| Path | Purpose |
|---|---|
| `src/server.ts` | Entrypoint (empty) |
| `src/app.ts` | Express app setup (empty) |
| `src/lib/prisma.ts` | PrismaClient singleton with driver adapter |
| `src/middleware/` | Auth, validation, error handler stubs (empty) |
| `src/module/` | Per-feature modules (empty) |
| `planning.md` | Full architecture/API/schema design doc |
| `complition.md` | (empty — completion notes) |

## Architecture plan (from `planning.md`)

Modular pattern: each feature in `src/modules/<name>/` with `controller.ts`, `service.ts`, `routes.ts`, `schema.ts`, `types.ts`. Routes mounted under `/api` in `src/routes/index.ts`. Middleware stack: helmet → cors → json → morgan → rate limiter → auth → validation → handler → error handler.

Planned: JWT auth (access + refresh tokens), Zod validation, Winston logging, Multer/Cloudinary upload, AI recommendation (Gemini/OpenAI), Swagger docs.

## Important gap

The `planning.md` describes a **flat rental marketplace** schema (listings, favorites, inquiries, reviews). The **generated** Prisma client (`generated/prisma/`) contains a **competitive programming** schema (Problem, Submission, TestCase, User, AiReview, LeaderboardSnapshot, etc.). The schema `.prisma` file is missing from disk. Resolve this before writing queries.
