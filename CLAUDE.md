# GRACE AUTOPILOT
## Persistent Project Memory

This file is the authoritative project context for Claude Code.

Read this file before making changes to the repository.

Official architecture (adopted 2026-09-27): docs/architecture/grace-autopilot.md
Documentation is not evidence of implementation. Section 33 records what actually exists.

---

# 1. PROJECT IDENTITY

Project name:
Grace Vladmir

(Character name is spelled "Vladmir". The repository name "Grace-valdmir-" is a legacy spelling and is not renamed.)

Repository:
Grace-valdmir-

GitHub:
https://github.com/Jatin18012000/Grace-valdmir-

Owner:
Jatin

Product name:
GRACE AUTOPILOT (official product definition since 2026-09-27)

Product definition:

GRACE AUTOPILOT is a local-first autonomous AI influencer operating system that generates
content ideas, converts those ideas into Grace-specific prompts, sends generation jobs to
locally hosted ComfyUI workflows, collects and validates generated assets, creates captions
and hashtags, schedules content, and prepares/publishes Grace Vladmir content to Instagram
through a controlled browser automation layer.

Target flow:

Idea → Content Plan → Prompt → ComfyUI → Flux/Wan → Output folder → Asset ingestion
→ Identity QC → Content QC → Caption + Hashtags → Scheduling → Publishing queue
→ Browser adapter (Claude/Chrome) → Instagram

The long-term goal is minimal human intervention, built incrementally and safely.

Ownership: the application owns state, scheduling, jobs, database, queues, asset library, QC,
retries and logs. AI models own creativity (ideas, copy, prompts). ComfyUI owns generation.
Claude/Chrome only performs browser interaction when the publishing adapter invokes it.

Cost: no additional per-post API/SaaS cost. Paid services need explicit approval.

The character's visual identity is a core product requirement.

---

# 2. CORE PRINCIPLE

Grace must remain visually consistent.

The system must NOT generate a completely new person every time.

Character identity should be persistent and controlled.

The following can change:

- location
- environment
- clothing
- hairstyle within controlled limits
- pose
- expression
- camera
- lighting
- composition
- activity
- content concept

The following should remain highly consistent:

- facial identity
- facial proportions
- eyes
- eyebrow structure
- nose
- lips
- jaw/face shape
- general skin characteristics
- core hair characteristics
- overall body identity

Identity consistency has higher priority than stylistic variation.

---

# 3. CHARACTER — GRACE

Grace is an AI-generated fictional influencer character.

Current visual references establish her appearance.

Core visual characteristics:

- feminine photorealistic appearance
- long dark brown / near-black hair (locked 2026-09-27; lighting may make it look lighter)
- light blue eyes (locked 2026-09-27)
- defined dark eyebrows
- full lips
- defined cheekbones
- defined facial structure
- warm/olive skin tone
- long hair as an important identity characteristic
- realistic photographic appearance

The uploaded/reference images are identity references.

Do not arbitrarily redefine Grace's face.

Do not introduce unrelated facial features.

Do not make Grace look like a different person simply because a prompt requests a different style.

---

# 4. CHARACTER IDENTITY SYSTEM

Grace must have a persistent Character Bible.

The Character Bible should eventually contain:

## Identity

- character ID
- name
- username
- biography
- personality
- interests
- communication style
- vocabulary
- catchphrases
- values
- dislikes
- niche
- languages
- target audience

## Physical identity

- face structure
- eyes
- eyebrows
- nose
- lips
- jaw
- cheekbones
- skin
- hair
- body proportions

## Visual style

- photography style
- preferred compositions
- camera characteristics
- lighting characteristics
- color characteristics
- realism level

## Wardrobe

Wardrobe is variable.

Examples:

- casual
- streetwear
- fitness
- business
- travel
- luxury
- summer
- winter
- evening
- creator/tech

Wardrobe must NOT redefine character identity.

---

# 5. REFERENCE IMAGE SYSTEM

Reference images are extremely important.

References should be categorized rather than treated as generic images.

Possible categories:

- PRIMARY_IDENTITY
- FACE
- BODY
- HAIR
- WARDROBE
- POSE
- ENVIRONMENT
- STYLE

The system should know which references are identity-critical.

Primary face references should be reused for identity consistency.

Do not randomly replace primary identity references.

Each reference should ideally track:

- file path
- category
- tags
- checksum
- creation date
- character ID
- source
- generation relationship

---

# 6. GENERATION ARCHITECTURE

The project uses different models for different jobs.

IMPORTANT:

Flux is primarily the image-generation engine.

Wan is primarily the video-generation engine.

Do NOT force one model to perform every task.

Architecture:

Character Bible
        ↓
Content Engine
        ↓
Prompt Engine
        ↓
Flux / ComfyUI
        ↓
High-quality still image
        ↓
Wan / ComfyUI
        ↓
Video
        ↓
Voice / Audio
        ↓
FFmpeg
        ↓
Final Reel/Post

---

# 7. FLUX

A working Flux-based ComfyUI image-generation workflow already exists.

IMPORTANT:

Do NOT replace the existing Flux workflow without explicit approval.

Do NOT guess node IDs.

Do NOT invent model names.

Do NOT invent workflow structure.

Inspect the actual workflow JSON before integrating it.

Determine:

- checkpoint/model
- CLIP/text encoding nodes
- positive prompt node
- negative prompt node if present
- reference-image nodes
- IPAdapter if present
- LoRA if present
- ControlNet if present
- sampler
- scheduler
- latent dimensions
- output node
- image save/output mechanism

The application should eventually be able to submit this workflow automatically.

---

# 8. WAN

A Wan-based ComfyUI video workflow is being developed.

Wan will eventually be used for:

- image-to-video
- potentially text-to-video
- character animation
- reels
- short-form video

The preferred initial architecture is:

Flux still image
        ↓
Wan image-to-video
        ↓
short video
        ↓
FFmpeg/post-processing

Do not assume a Wan workflow is working until it has actually been tested.

Do not claim a video model works simply because its workflow exists.

---

# 9. COMFYUI

ComfyUI is a local production engine.

Default expected URL:

http://127.0.0.1:8188

The application should eventually support:

- health check
- workflow submission
- prompt submission
- job ID tracking
- queue status
- completion detection
- failure detection
- output retrieval
- asset registration

ComfyUI may be offline.

The application must gracefully handle:

COMFYUI ONLINE

and

COMFYUI OFFLINE

The UI must not crash when ComfyUI is unavailable.

---

# 10. IMPORTANT COMFYUI RULE

NEVER GUESS THE WORKFLOW.

Before implementing a workflow adapter:

1. inspect the actual workflow JSON
2. identify node IDs
3. identify node types
4. identify input fields
5. identify model references
6. identify output nodes
7. determine which fields are safe to modify
8. create a mapping layer

Workflow-specific node IDs must not be scattered throughout the application.

Use a workflow adapter/mapping layer.

---

# 11. CONTENT ENGINE

The system should eventually create:

- Instagram Posts
- Instagram Carousels
- Instagram Reels
- Instagram Stories
- YouTube Shorts
- LinkedIn posts
- Facebook content

Initial priority:

Instagram.

Content pipeline:

Idea
→ Concept
→ Hook
→ Script / Copy
→ Visual Direction
→ Image Prompt
→ Video Prompt
→ Generation
→ QC
→ Caption
→ CTA
→ Hashtags
→ Approval

---

# 12. SOCIAL MEDIA NICHE

Primary content niche (decided 2026-09-27):

LIFESTYLE FIRST: chill, aspirational "dream life" content.

Secondary / occasional:

- AI
- AI tools
- AI news
- AI productivity
- technology
- creator technology

AI/tech content supports the character; it is not the main niche.
AI news as a primary focus belongs to the separate AIwaliBat brand, not Grace.

The content system should balance:

- educational content
- technology content
- lifestyle
- personality
- visual content
- trend-aware content

Do not make every post look like an advertisement.

---

# 13. CONTENT GOALS

Primary:

1. Build audience
2. Increase engagement
3. Increase reach
4. Generate leads/revenue later

Do not fabricate analytics.

Do not fabricate followers.

Do not fabricate engagement.

---

# 14. ASSET LIBRARY

Every generated asset should be traceable.

An asset should ideally know:

- asset ID
- file path
- MIME type
- dimensions
- file size
- character
- content item
- generation job
- workflow
- model
- prompt
- negative prompt
- parameters
- tags
- timestamp
- checksum

Images, videos, audio and references should be separate asset types.

---

# 15. GENERATION JOBS

Generation jobs should have states:

QUEUED
SUBMITTED
RUNNING
COMPLETED
FAILED
CANCELLED

Every generation should be traceable to:

Character
+
Workflow
+
Prompt
+
Model
+
Parameters

Never create fake generation jobs.

Never show COMPLETED if the generation was not actually completed.

---

# 16. QUALITY CONTROL

Generated media should pass QC before approval.

QC should check where practical:

- file exists
- valid media
- dimensions
- aspect ratio
- generation completed
- required metadata exists
- duplicate detection
- character consistency metadata
- missing references
- missing prompt
- content completeness

QC status (changed 2026-09-27 by the GRACE AUTOPILOT directive; was PASS/WARNING/FAIL):

PASS
REVIEW
FAIL

Identity QC and content QC are separate layers. Automated face verification is never
claimed to be perfect; thresholds come only from calibration on real Grace references.

Failed QC must not automatically move to publishing.

---

# 17. HUMAN APPROVAL

The system should NOT automatically publish content in the early versions.

Required flow:

GENERATED
→ QC
→ HUMAN APPROVAL
→ SCHEDULED
→ PUBLISHED

Human approval is mandatory until the publishing system has been explicitly approved for automation.

Autopilot modes (GRACE AUTOPILOT):

- ASSISTED (default): the system prepares everything; a human approves each publish.
- SUPERVISED: the system runs everything including QC; a human can review before publishing.
- FULL: publishes without approval. Must NOT be enabled during development; needs explicit approval.

PUBLISH_MODE defaults to MANUAL_APPROVAL. Never silently publish. Never silently delete assets.
Publishing goes through a replaceable PublishingAdapter (Manual first; Claude/Chrome is EXPERIMENTAL).

---

# 18. VIDEO PIPELINE

Target short-form video pipeline:

Image
→ Wan animation
→ Voice
→ Music
→ Captions
→ FFmpeg
→ Final 9:16 video

Typical target:

1080 × 1920
9:16
30 FPS where appropriate

Do not upscale unnecessarily if the source/model cannot support it.

Do not claim "4K" unless the actual output supports it.

---

# 19. FFMPEG

FFmpeg should eventually handle local post-processing such as:

- resizing
- cropping
- concatenation
- audio mixing
- subtitles
- captions
- transitions
- encoding
- final export

Do not introduce unnecessary paid video SaaS.

---

# 20. LOCAL LLM (LM STUDIO)

Decided by Jatin (2026-09-26): the initial local LLM provider is LM Studio.
Update 2026-09-27: Ollama is installed on the Mac and may be added later as another
LlmProvider adapter. It is not integrated now. Nothing may call LM Studio except its adapter.

LM Studio is an optional local AI provider.

Expected URL (LM Studio's default local server; not yet confirmed on Jatin's machine):

http://127.0.0.1:1234

LM Studio exposes an OpenAI-compatible API (for example GET /v1/models).
The local server must be started in LM Studio before it responds.

Potential responsibilities:

- content ideation
- prompt expansion
- caption generation
- script generation
- dialogue
- QC assistance

The application must detect whether LM Studio is available.

Do not make the entire application dependent on LM Studio being online.

---

# 21. LOCAL-FIRST PRINCIPLE

Prefer local tools whenever practical.

Current environment:

- MacBook M5
- 24 GB unified memory
- 1 TB SSD
- ComfyUI
- Flux
- Wan
- LM Studio
- FFmpeg
- Node.js
- TypeScript
- Next.js where applicable
- SQLite where applicable

Avoid unnecessary:

- cloud databases
- microservices
- Kubernetes
- Redis
- Kafka
- paid workflow platforms
- unnecessary SaaS
- unnecessary Python services

The system should remain practical for a single developer running locally.

---

# 22. SOFTWARE ENGINEERING RULES

Before changing code:

1. inspect existing implementation
2. understand dependencies
3. check git status
4. identify existing working functionality
5. preserve working features
6. make the smallest appropriate change

Never blindly rewrite the project.

Never delete working code simply because another architecture seems cleaner.

Never create duplicate systems when an existing implementation can be extended.

Use strict TypeScript.

Avoid `any` unless absolutely necessary.

Validate external input.

Handle provider failures gracefully.

Keep provider-specific logic isolated.

---

# 23. NO FAKE IMPLEMENTATION

This is critical.

Never create:

- fake ComfyUI responses
- fake generation statuses
- fake assets
- fake analytics
- fake model outputs
- fake publishing success
- fake provider health
- fake completed jobs

If something is not implemented:

mark it clearly as TODO / NOT IMPLEMENTED.

If something cannot be tested:

say so.

---

# 24. DATABASE / TRACEABILITY

The architecture should maintain relationships such as:

Character
↓
CharacterReference
↓
GenerationJob
↓
Asset
↓
ContentItem
↓
ContentVersion
↓
QCResult

Every generated asset should be traceable back to its generation.

---

# 25. UI

The eventual dashboard should include:

- Overview
- Character
- Content
- Generate
- Assets
- Workflows
- Jobs
- QC
- Settings

Dashboard should show real system state.

For example:

ComfyUI:
ONLINE / OFFLINE

LM Studio:
ONLINE / OFFLINE

Jobs:
QUEUED / RUNNING / FAILED / COMPLETED

Never fabricate these values.

---

# 26. CURRENT DEVELOPMENT PRIORITY

Official phase order (GRACE AUTOPILOT, 2026-09-27; replaces the earlier 13-phase list).
Each phase ends with tests and a report, then STOPS for approval.

PHASE 0   Project audit (done 2026-09-27)
PHASE 1   Foundation (mostly done; gaps: system_events logging, settings, error conventions)
PHASE 2   Grace identity system (identity schema, reference registry, versioning)
PHASE 3   Content intelligence (ideas, creative briefs, LLM provider, prompt compiler)
PHASE 4   ComfyUI controller (health, workflow registry, submit, track, output detection)
PHASE 5   Flux integration (real exported API workflow, real generation)
PHASE 6   Asset library (ingestion, states, identity + content QC, traceability)
PHASE 7   Wan integration (real workflow, benchmarked on the M5 24 GB)
PHASE 8   Captions + hashtags
PHASE 9   Scheduler
PHASE 10  Publishing queue (approval, retries, manual fallback)
PHASE 11  Claude / Chrome publishing adapter (EXPERIMENTAL)
PHASE 12  End-to-end autopilot
PHASE 13  Dashboard

Voice/audio and FFmpeg reel assembly are not in this list; they follow Phase 12 unless re-ordered.

---

# 27. CURRENT IMMEDIATE OBJECTIVE

Make the pipeline reliable from left to right:

1. Idea → Prompt → ComfyUI → Output → Asset
2. then → QC → Caption → Schedule
3. then → Publish

Do not jump to Instagram publishing. The LLM never writes the final prompt: creative brief
(LLM) + Grace identity (system) → deterministic, versioned prompt compiler → ComfyUI.

---

# 28. DEVELOPMENT COMMUNICATION

At the end of every phase, report in this format (GRACE AUTOPILOT, 2026-09-27):

STATUS: DONE / PARTIAL / BLOCKED
IMPLEMENTED: [list]
TESTED: [list, with the commands and results]
NOT TESTED: [list]
BLOCKERS: [list]
FILES CHANGED: [list]
NEXT STEP: [one clear next step]

"Code compiles" is not "integration works". "Architecture exists" is not "feature works".
Do not say "done" if it has not been tested.

---

# 29. USER DECISION RULE

Jatin is the project owner.

Claude Code is the implementation agent.

Do not make major architectural changes without explaining them.

If there are multiple valid approaches, explain the trade-offs and recommend one,
but do not silently replace the existing architecture.

---

# 30. MOST IMPORTANT RULE

Preserve Grace's identity.

Preserve working Flux functionality.

Do not guess ComfyUI workflows.

Do not fabricate functionality.

Do not overwrite working systems unnecessarily.

Build incrementally.

Test every major integration.

The goal is a real local AI Influencer production system,
not a mockup or demonstration.

---

# 31. DECISIONS AND OPEN QUESTIONS

## Decided by Jatin (2026-09-27)

1. Flux workflow: APPROVED to change only the positive prompt wording (remove the
   "completely new / different person" instructions) and to replace `woman_reference.jpg`
   with an approved Grace image. All nodes, models and settings stay as they are.
   Not yet applied: needs the Export (API) JSON and the approved Grace image first.
2. Niche: lifestyle first; AI/tech is secondary (see Section 12).
3. Name: "Grace Vladmir".
4. Eyes: light blue.

5. Reference images and generated media stay on Jatin's Mac only, never in GitHub (2026-09-27).
   Local folder: ~/Grace-assets/references/grace/ (outside the repo). The repo may store only
   metadata (file name, category, checksum). .gitignore blocks image, video and audio files.
   The PRIMARY_IDENTITY image must also be copied into ~/ComfyUI/input/ for the Flux LoadImage node.
6. Proposed reference categories (awaiting Jatin's approval) for the 5 images shared 2026-09-27:
   cafe close-up = PRIMARY_IDENTITY; airport = FACE; hotel entrance = FACE backup (eyes lean green);
   street with sunglasses = STYLE/HAIR/WARDROBE only; hotel window sea view = ENVIRONMENT/STYLE only
   (lighter hair, face drifts). Mapping to files in ~/ComfyUI/output/ not yet identified.

7. Hair colour LOCKED as "dark brown / near-black" (2026-09-27). Nose and face shape are PENDING:
   never guess or fill them. Only approved attributes are locked facts (see characters/grace/bible.json).
8. Foundation stack APPROVED (2026-09-27): Next.js, TypeScript (strict), SQLite (better-sqlite3),
   Zod, Vitest. LLM access goes through the LlmProvider interface; LM Studio is the first provider.

9. GRACE AUTOPILOT adopted as the official product definition (2026-09-27).
   Architecture: docs/architecture/grace-autopilot.md.

## Still open

1. Publishing adapter feasibility: can the app trigger Claude in Chrome / Cowork on a schedule?
   Untested. Instagram's terms restrict automated access; account-risk decision is Jatin's.
   ManualAdapter must work end to end first.
2. Workflow file location: the Flux API export goes to comfy/workflows/flux_grace_api.json
   (directive). The existing UI-format files are in workflows/flux/. Consolidate in Phase 4.
3. Wan on 24 GB unified memory (untested).
   Native 1080 x 1920 at 30 FPS may not be feasible locally; a smaller or quantized Wan model
   plus FFmpeg upscaling/interpolation may be needed. Decide after a real test.

# 32. AUDIT STATUS (2026-09-27)

- Repository contained only README.md before this file was added. No application code yet.
- Flux workflow: known only from a screenshot. Values visible there (not yet confirmed from JSON):
  flux1-dev-Q4_K_S.gguf (UNet Loader GGUF), clip_l.safetensors + t5xxl_fp8_e4m3fn.safetensors
  (Dual CLIP, type flux), ae.safetensors (VAE), EmptySD3LatentImage 832 x 1216,
  Apply IPAdapter Flux Model (weight 1.0, start 0, end 1) with ip-adapter.bin +
  google/siglip-so400m-patch14-*, provider mps, KSampler seed 0 fixed / 20 steps / cfg 1.0 /
  euler / simple / denoise 1.0, negative = Conditioning Zero Out, Save Image prefix "ComfyUI".
  Workflow appears to be a subgraph ("Text to Image (Flux.1 Dev)").
- Confirmed on Jatin's Mac (2026-09-26, from `ls` output; files seen, not loaded or tested):
  - Saved workflows in ~/ComfyUI/user/default/workflows/: flux_dev_ipadapter_flux_wired.json,
    FLUX_V1_BASELINE.json. Jatin confirmed (2026-09-26) the working workflow is
    flux_dev_ipadapter_flux_wired.json. FLUX_V1_BASELINE.json is not the production workflow.
  - models/unet/flux1-dev-Q4_K_S.gguf is a symlink to
    ~/.lmstudio/models/city96/FLUX.1-dev-gguf/flux1-dev-Q4_K_S.gguf (the file lives in LM Studio's folder).
  - models/text_encoders/: clip_l.safetensors (246 MB), t5xxl_fp8_e4m3fn.safetensors (4.9 GB).
  - models/vae/: ae.safetensors (335 MB).
  - models/clip, diffusion_models, checkpoints, loras: empty (placeholder files only).
  - models/ipadapter/ does not exist; the Flux IPAdapter model is models/ipadapter-flux/ip-adapter.bin.
    No SigLIP files under models/ (likely in the Hugging Face cache; not yet confirmed).
  - custom_nodes/: ComfyUI-GGUF, comfyui-ipadapter-flux, websocket_image_save.py.
  - input/: IMG_4706.jpg, example.png, clipspace-* masks, 3d/. No woman_reference.jpg present;
    which image the workflow actually loads must be checked in the workflow JSON.
  - ComfyUI (8188) and LM Studio (1234) did not respond at check time (likely not running).
- Flux workflow JSON (UI format) audited: see docs/audit/flux-workflow-audit.md. Key points: saved
  prompt is empty; reference image is clipspace-painted-masked-1790144092869.png (temp mask-editor
  file); image saved twice (prefixes Flux.1_Dev and ComfyUI); SigLIP loads from the HF cache.
- Still needed: Flux Export (API) JSON, Wan workflow JSON,
  3-5 approved Grace images.

# 33. IMPLEMENTATION STATUS

Foundation (2026-09-27) is implemented and tested in the cloud container. Not yet run on Jatin's Mac.
Exists: config, SQLite + migrations, Character Bible (locked/pending, versions, export),
LlmProvider + LM Studio adapter, ComfyUI/LM Studio health checks, Overview + Grace pages, 37 tests.
Does not exist: everything else in the gap table of docs/architecture/grace-autopilot.md.
Phases after Foundation require separate approval.
