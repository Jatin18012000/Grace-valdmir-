# GRACE — AI INFLUENCER OS
## Persistent Project Memory

This file is the authoritative project context for Claude Code.

Read this file before making changes to the repository.

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

Project type:
AI Influencer Operating System

Primary objective:

Build a local-first AI Influencer production system capable of creating consistent,
high-quality social-media content featuring the same AI influencer character across
images, videos, reels, stories and other media.

The system should eventually handle:

Character → Content Idea → Prompt → Image → Video → Voice → Editing → QC → Approval → Publishing

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
- long dark brown / near-black hair
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

Possible QC status:

PASS
WARNING
FAIL

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

Decided by Jatin (2026-09-26): the local LLM provider is LM Studio, not Ollama.
Ollama is not used. Do not check for or integrate Ollama.

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

Do NOT try to build the entire system simultaneously.

Preferred order:

PHASE 1
Repository audit

PHASE 2
Character identity system

PHASE 3
Reference-image system

PHASE 4
Existing Flux workflow integration

PHASE 5
Reliable Flux generation jobs

PHASE 6
Asset library

PHASE 7
Wan workflow integration

PHASE 8
Flux → Wan pipeline

PHASE 9
Content engine

PHASE 10
Voice/audio/FFmpeg

PHASE 11
QC

PHASE 12
Dashboard refinement

PHASE 13
Publishing automation

---

# 27. CURRENT IMMEDIATE OBJECTIVE

The immediate goal is NOT to finish the entire AI Influencer OS.

The immediate goal is:

Build a reliable pipeline that can generate Grace consistently.

First:

Character
→ Reference
→ Flux
→ Image

Then:

Image
→ Wan
→ Video

Then:

Video
→ Voice
→ Captions
→ FFmpeg
→ Reel

Only after these work independently should they be fully orchestrated by the AI Influencer OS.

---

# 28. DEVELOPMENT COMMUNICATION

When reporting progress:

Always separate:

WORKING
PARTIALLY WORKING
NOT IMPLEMENTED
BLOCKED
NEEDS USER INPUT

Always provide:

- files changed
- commands run
- tests run
- test results
- remaining issues
- exact next step

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

## Still open

1. Hair: lock one value (dark brown or near-black).
2. Wan on 24 GB unified memory (untested).
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
