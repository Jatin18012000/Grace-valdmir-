# Grace OS

Local-first AI Influencer Operating System for **Grace Vladmir**, a fictional AI influencer.
Project rules and decisions: [`CLAUDE.md`](CLAUDE.md).

## Status

Foundation phase only. Implemented: configuration, SQLite schema/migrations, Character Bible
(validation, storage, versioning, export), LLM provider abstraction (LM Studio), ComfyUI and
LM Studio health checks, and a minimal dashboard (Overview, Grace).

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

## Layout

```
characters/grace/bible.json   Character Bible (source of truth for Grace's defined attributes)
src/core/config               Environment configuration (zod-validated)
src/core/db                   SQLite connection and migrations
src/core/character            Bible schema, loading, repository, export
src/core/providers/llm        LLM provider interface + LM Studio implementation
src/core/providers/comfyui    ComfyUI health check
src/app                       Next.js pages and API routes
tests/                        Vitest suites
workflows/flux                ComfyUI workflow files (UI format)
```

Reference images and generated media are never committed; they stay on the local machine.
