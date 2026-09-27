# Grace Autopilot

Local-first autonomous AI influencer operating system for **Grace Vladmir**, a fictional AI influencer.
Architecture: [`docs/architecture/grace-autopilot.md`](docs/architecture/grace-autopilot.md).
Project rules and decisions: [`CLAUDE.md`](CLAUDE.md).

## Status

Phase 1 (Foundation) only. Implemented: configuration, SQLite schema/migrations, Character Bible
(validation, storage, versioning, export), LLM provider abstraction (LM Studio), ComfyUI and
LM Studio health checks, structured event log, runtime settings, typed errors, and a minimal
dashboard (Overview, Grace).

Not implemented yet: references, Flux generation, jobs, assets, identity QC, Wan, content engine,
voice, FFmpeg, publishing.

## Requirements

- Node.js 22.12 or newer
- Optional, for live status: ComfyUI and LM Studio (local server started) running on this Mac

## Setup

```bash
npm install
cp .env.example .env.local   # optional; defaults work for a standard local setup
npm run db:init              # creates data/grace.db and loads characters/grace/bible.json
npm run dev                  # http://localhost:3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript (strict) |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:init` | Apply migrations and sync the Character Bible |
| `npm run check` | typecheck + lint + test + build |

## API

| Route | Purpose |
|---|---|
| `GET /api/health` | Live status: database, settings, output folder, ComfyUI, LLM, recent events |
| `GET /api/settings` | Current settings with source (DEFAULT, ENV, USER) |
| `PATCH /api/settings` | `{"key": "autopilot_mode", "value": "SUPERVISED"}` |
| `GET /api/events` | Event log, newest first. Filters: `eventType`, `minSeverity`, `entityType`, `entityId`, `beforeId`, `limit` |
| `GET /api/characters/:id` | Stored Character Bible |
| `GET /api/characters/:id/export?format=json\|md` | Bible export |

Settings from environment variables only seed the database the first time. After that, the
stored value wins. FULL autopilot and AUTOMATIC publishing are blocked unless
`ALLOW_FULL_AUTOPILOT=true` (must stay false during development).

## Layout

```
characters/grace/bible.json   Character Bible (source of truth for Grace's defined attributes)
src/core/config               Environment configuration (zod-validated)
src/core/settings             Runtime settings (SQLite) and their definitions
src/core/events               Structured event log
src/core/errors.ts            AppError codes, redaction, safe public messages
src/core/db                   SQLite connection and migrations
src/core/character            Bible schema, loading, repository, export
src/core/providers/llm        LLM provider interface + LM Studio implementation
src/core/providers/comfyui    ComfyUI health check
src/app                       Next.js pages and API routes
tests/                        Vitest suites
workflows/flux                ComfyUI workflow files (UI format)
```

Reference images and generated media are never committed; they stay on the local machine.
