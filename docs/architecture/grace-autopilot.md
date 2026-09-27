# GRACE AUTOPILOT: Architecture

Status: official product definition, adopted 2026-09-27 (owner: Jatin).
This document describes the target system and the verified state of each part.
A part marked MISSING or BLOCKED does not exist yet, whatever this document describes.

## 1. Product definition

> GRACE AUTOPILOT is a local-first autonomous AI influencer operating system that generates
> content ideas, converts those ideas into Grace-specific prompts, sends generation jobs to
> locally hosted ComfyUI workflows, collects and validates generated assets, creates captions
> and hashtags, schedules content, and prepares/publishes Grace Vladmir content to Instagram
> through a controlled browser automation layer.

Target flow:

```
IDEA → CONTENT PLAN → PROMPT → COMFYUI → FLUX / WAN → OUTPUT FOLDER → ASSET INGESTION
→ IDENTITY QC → CONTENT QC → CAPTION + HASHTAGS → SCHEDULING → PUBLISHING QUEUE
→ BROWSER ADAPTER (Claude / Chrome) → INSTAGRAM
```

Cost target: no additional per-post API or SaaS cost. Generation, storage, scheduling and the
database run locally. The existing Claude subscription is an existing cost, not a free resource.

## 2. Ownership

| Owner | Owns |
|---|---|
| The application (this repo) | state, scheduling, jobs, database, content queue, generation queue, asset library, QC, publishing queue, retries, logs |
| AI models (LLM) | ideas, creative direction, copy, captions, hashtags, content interpretation |
| ComfyUI | local image and video generation (Flux, Wan) |
| Claude / Cowork / Chrome | browser interaction, only when the publishing adapter invokes it |
| Instagram | the social platform |

Deterministic software orchestrates. AI is used only for creative or interpretive tasks.
No single external tool owns the whole system.

## 3. Target architecture

```
                 GRACE AUTOPILOT
                        │
        ┌───────────────┴───────────────┐
 CONTENT INTELLIGENCE              GRACE IDENTITY
 (ideas, briefs; LLM)       (bible, references; system-owned)
        └───────────────┬───────────────┘
                 PROMPT COMPILER (deterministic, versioned)
                        │
                 GENERATION QUEUE
                        │
                 COMFYUI CONTROLLER
                   /           \
                FLUX           WAN
                   \           /
            OUTPUT RESOLVER / WATCHER
                        │
                   ASSET LIBRARY
                        │
             IDENTITY QC → CONTENT QC
                        │
               CAPTION + HASHTAGS
                        │
                    SCHEDULER
                        │
                PUBLISHING QUEUE
                        │
         PUBLISHING ADAPTER (Manual | ClaudeBrowser | future)
                        │
                     INSTAGRAM
```

Everything runs in one local Next.js + TypeScript application with SQLite. No microservices,
Redis, Kafka, Kubernetes or cloud database. Background work (queue polling, scheduler, output
detection) runs as a local worker process started alongside the app. How that worker is
started is a Phase 9 decision.

## 4. Identity architecture (critical rule)

The LLM never writes the final generation prompt directly.

```
CONTENT IDEA → CREATIVE BRIEF (LLM) → GRACE IDENTITY ENGINE (system) → PROMPT COMPILER → COMFYUI
```

| The LLM controls | The system controls |
|---|---|
| scene, concept, activity, mood, location | Grace's identity text (from LOCKED bible fields only) |
| camera direction, clothing concept | eye colour, hair identity |
| creative variation | reference image selection and IPAdapter conditioning |
| | model, sampler, scheduler, VAE, workflow structure |

The creative brief is validated with zod. Any identity-related content in it (eye colour, hair,
face) is rejected or stripped before compilation. PENDING identity attributes (nose, face shape,
eye shape, jaw, facial proportions) are never written into prompts; the reference image carries
them.

Every generation records `prompt_compiler_version`, `bible_sha256` (identity version),
`workflow_version`, `reference_sha256` and `model`.

## 5. State machines

Content item (pipeline):

```
IDEA_CREATED → BRIEF_CREATED → PROMPT_CREATED → GENERATION_QUEUED → GENERATION_RUNNING
→ GENERATION_COMPLETED → ASSET_INGESTED → QC_RUNNING → QC_PASSED → CAPTION_CREATED
→ PUBLISHING_QUEUED → SCHEDULED → PUBLISHING → PUBLISHED

Failure states: GENERATION_FAILED, QC_FAILED, CAPTION_FAILED, PUBLISH_FAILED
```

Generation job: `QUEUED → SUBMITTED → RUNNING → COMPLETED | FAILED | CANCELLED`

Asset: `GENERATED → INGESTED → QC_PENDING → QC_PASSED | QC_FAILED → APPROVED → SCHEDULED
→ PUBLISHING → PUBLISHED | PUBLISH_FAILED → ARCHIVED`

QC result: `PASS | REVIEW | FAIL`

Rules:
- Transitions are only allowed along defined edges, enforced in code and tested.
- Every transition writes an `event_log` row (see section 8).
- A failure never deletes content. Assets are never silently deleted; archiving is explicit.

## 6. Autopilot modes

| Mode | Behaviour | Status |
|---|---|---|
| `ASSISTED` | System prepares idea, prompt, asset, caption, schedule. A human approves each publish. | Default |
| `SUPERVISED` | System runs everything including QC; a human can review before publishing. | Later |
| `FULL` | System publishes without approval. | Must not be enabled during development |

Configured with `AUTOPILOT_MODE` and `PUBLISH_MODE` (`MANUAL_APPROVAL` default, `AUTOMATIC` later).
FULL / AUTOMATIC needs explicit owner approval before it can be enabled.

**Execution-time re-check (recorded 2026-09-27, Phase 1 finding).** The Phase 1 settings service
enforces the `ALLOW_FULL_AUTOPILOT` lock only when a value is written. A FULL or AUTOMATIC value
saved while the lock was open stays stored if the lock is later closed. Therefore every future
component that performs an unattended or external action (Phase 10 publishing queue, Phase 11
browser adapter, Phase 12 autopilot) must, immediately before that action, re-read and check:

1. `autopilot_mode`
2. `publish_mode`
3. the current `ALLOW_FULL_AUTOPILOT` safety lock from configuration

If the stored mode is FULL/AUTOMATIC and the lock is not currently open, the action must not run
unattended: it falls back to manual approval and is logged. A previously saved FULL/AUTOMATIC value
must never bypass the current safety configuration.

## 7. Safety and failure handling

| Situation | Behaviour |
|---|---|
| ComfyUI offline | Do not submit; jobs stay QUEUED |
| LLM offline | Content generation stays queued |
| Generation fails | Retry per policy, then GENERATION_FAILED |
| Output file missing | Job FAILED; nothing is invented |
| QC fails | Never publishes |
| Caption fails | Retry, then CAPTION_FAILED |
| Browser automation fails / Instagram UI changed | PUBLISH_FAILED; job and asset kept for retry or manual publish |

Duplicate protection: each generation job has an idempotency key. A job is never submitted twice
unless a retry is explicitly recorded.

## 8. Observability

Table `event_log` (migration 2): `id, occurred_at, event_type, severity, source, entity_type,
entity_id, message, metadata_json, created_at`. Event types, severities (DEBUG, INFO, WARNING,
ERROR, CRITICAL) and entity types are closed lists in `src/core/events`. The 18 pipeline event
types (IDEA_CREATED … PUBLISH_FAILED) are defined; Phase 1 only emits system events
(APP_STARTED, MIGRATION_APPLIED, SETTINGS_INITIALIZED, SETTING_CHANGED, CHARACTER_BIBLE_SYNCED,
CHARACTER_BIBLE_INVALID, SYSTEM_ERROR). Metadata is redacted for secrets before it is stored.
The dashboard reads these; nothing on the dashboard is invented.

Errors: every module throws `AppError` with a code (CONFIGURATION_ERROR, DATABASE_ERROR,
VALIDATION_ERROR, NOT_FOUND, LLM_ERROR, COMFYUI_ERROR, GENERATION_ERROR, ASSET_ERROR, QC_ERROR,
SCHEDULING_ERROR, PUBLISHING_ERROR, UNKNOWN_ERROR). API responses carry only `{ code, message }`
(safe message); full redacted diagnostics go to the server log and, for server errors, to
`event_log` as SYSTEM_ERROR.

Settings: table `settings` (migration 3), service in `src/core/settings`. Keys: `autopilot_mode`
(ASSISTED | SUPERVISED | FULL, default ASSISTED), `publish_mode` (MANUAL | AUTOMATIC, default
MANUAL), `comfyui_output_folder` (absolute path). Environment variables seed a key only when it is
first created; afterwards the stored value wins and changes go through `PATCH /api/settings`,
each recorded as SETTING_CHANGED. FULL and AUTOMATIC are rejected unless `ALLOW_FULL_AUTOPILOT=true`.

## 9. Data model (planned SQLite tables)

| Table | Phase | Exists now |
|---|---|---|
| `schema_migrations` | 1 | yes |
| `characters`, `character_bible_versions` (= grace_identity + identity versioning) | 1 | yes |
| `event_log`, `settings` | 1 | yes (migrations 2, 3) |
| `reference_images` | 2 | no |
| `content_ideas`, `creative_briefs`, `compiled_prompts` | 3 | no |
| `workflows`, `generation_jobs` | 4 | no |
| `assets`, `qc_results` | 6 | no |
| `captions`, `hashtags` | 8 | no |
| `schedule` | 9 | no |
| `publishing_jobs` | 10 | no |

## 10. External integration facts and unknowns

**ComfyUI** (verified on Jatin's Mac by file listing only; the server has never been reached by this app):
- Output folder: `/Users/jatinpal/ComfyUI/output/`. Every render currently appears twice
  (`ComfyUI_000NN_.png` and `IMG<digits>.png`, same size and time). The watcher must de-duplicate
  by checksum.
- Output detection should use the job's own record in ComfyUI (by prompt id) first and the
  folder watcher second, so files are linked to the job that made them rather than guessed from
  names. The exact ComfyUI HTTP endpoints must be verified against Jatin's installed version
  before use.
- URL: `http://127.0.0.1:8188` expected; ComfyUI Desktop may use 8000. Configurable.

**Flux**: only the UI-format workflow exists (`workflows/flux/flux_dev_ipadapter_flux_wired.json`,
audited in `docs/audit/flux-workflow-audit.md`). The API-format export
(`comfy/workflows/flux_grace_api.json`) does not exist and must not be created until exported
from ComfyUI.

**Wan**: no workflow in the repo. Not installed or tested as far as the repo shows. 24 GB unified
memory: resolution, duration and fps must be benchmarked; lower resolution plus FFmpeg upscaling
may be required.

**Publishing (Instagram via Claude / Chrome)**: EXPERIMENTAL, untested. Open questions:
1. Whether the app can trigger Claude in Chrome / Cowork on a schedule without a human
   starting it. Unverified.
2. Instagram's terms restrict automated access. Browser automation of a real account carries a
   risk of rate limits, checkpoints or account restrictions. This is the owner's risk decision.
3. Alternatives behind the same adapter boundary: `ManualAdapter` (the app prepares the files and
   caption, a human posts), local browser automation with a persistent Chrome profile, or an
   official Instagram API (requires a Business/Creator account and Meta app setup).

The core pipeline must work end to end with `ManualAdapter` before any browser adapter is built.

## 11. Gap analysis (audit 2026-09-27)

Legend: EXISTS (in repo and tested) · DOC (only described) · MISSING · BLOCKED (external artifact needed)

| Area | State | Notes |
|---|---|---|
| Next.js, TypeScript strict, SQLite, migrations, Zod, Vitest | EXISTS | 37 tests; typecheck, lint, build pass (cloud container only) |
| Config (env, zod) | EXISTS | Includes `AUTOPILOT_MODE`, `PUBLISH_MODE`, `COMFYUI_OUTPUT_FOLDER`, `ALLOW_FULL_AUTOPILOT` |
| Structured event log (`event_log`) | EXISTS | Infrastructure only; pipeline events emitted from later phases |
| Runtime settings (`settings`) | EXISTS | autopilot_mode, publish_mode, comfyui_output_folder |
| Error handling (`AppError` codes, redaction, safe API errors) | EXISTS | All API routes wrapped |
| LLM provider interface + LM Studio adapter | EXISTS | Tested with stubs only; never against real LM Studio |
| ComfyUI health check | EXISTS | Tested with stubs and a closed port only |
| Character Bible (locked/pending, versioning, export) | EXISTS | Reuse as the Grace Identity Engine's data source |
| Reference image registry (metadata, hash, approval, identity weight) | MISSING | BLOCKED on the file mapping of the 5 images on the Mac |
| Content ideas, creative briefs | MISSING | |
| Prompt compiler | MISSING | Design in section 4 |
| ComfyUI controller (submit, track, outputs, retries) | MISSING | Can be built and unit-tested now; real tests need the Mac |
| Flux adapter | BLOCKED | Needs the Flux API-format export |
| Output watcher / asset ingestion | MISSING | Real test needs the Mac |
| Asset library, state machine | MISSING | |
| Identity QC | MISSING | Mechanism to be designed; thresholds only from real references |
| Content QC | MISSING | |
| Wan adapter | BLOCKED | Needs the Wan workflow and a benchmark |
| Captions, hashtags | MISSING | |
| Scheduler, background worker | MISSING | |
| Publishing queue, ManualAdapter | MISSING | |
| Claude / Chrome publishing adapter | BLOCKED / EXPERIMENTAL | Needs feasibility test on the Mac and an owner risk decision |
| Dashboard | PARTIAL | Overview (live health) and Grace pages only |
| Voice / FFmpeg reel assembly | DOC | Not in the new phase list; scheduled after Phase 12 |

## 12. Implementation order

| Phase | Scope | Can start now? |
|---|---|---|
| 0 | Audit | Done (this document) |
| 1 | Foundation | Done (cloud-tested; not yet run on the Mac) |
| 2 | Grace identity system: reference registry, identity versioning, approval rules | Code yes; real data needs the reference file mapping |
| 3 | Content intelligence: ideas, briefs, prompt compiler, LLM via `LlmProvider` | Yes (real LLM test needs LM Studio on the Mac) |
| 4 | ComfyUI controller: workflow registry, submit, track, output resolver | Interfaces yes; stops at the adapter boundary without real workflows |
| 5 | Flux integration, real generation | BLOCKED: Flux API export |
| 6 | Asset library, ingestion, identity + content QC | After 5 |
| 7 | Wan integration + benchmark | BLOCKED: Wan workflow |
| 8 | Captions + hashtags | After 6 |
| 9 | Scheduler + background worker | After 8 |
| 10 | Publishing queue + ManualAdapter + approval | After 9 |
| 11 | Claude / Chrome publishing adapter (EXPERIMENTAL) | After 10 and a feasibility test |
| 12 | End-to-end autopilot | After 11 |
| 13 | Dashboard | Grows with each phase; refined last |

Each phase ends with tests and a report, then stops for approval.
