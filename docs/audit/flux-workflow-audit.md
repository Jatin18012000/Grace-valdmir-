# Flux workflow audit

Date: 2026-09-26
Source: `workflows/flux/flux_dev_ipadapter_flux_wired.json` (ComfyUI UI-format save, frontend 1.41.13,
workflow version 0.4). Confirmed by Jatin as the working workflow.
Method: static read of the JSON. Nothing was run. ComfyUI was not reachable during the audit.

This is the UI format, not the API format. The adapter must be built from the Export (API) JSON,
whose node IDs may differ for nodes inside the subgraph. Not yet provided.

## Structure

Top level (3 nodes):

| ID | Type | Values | Notes |
|---|---|---|---|
| 40 | MarkdownNote | template guide text | Not executed |
| 56 | Subgraph `e2a55522-…` "Text to Image (Flux.1 Dev)" | seed = 1012079273797201 | Only `seed` is wired into the subgraph |
| 9 | SaveImage | filename_prefix = `Flux.1_Dev` | Receives subgraph IMAGE output |

The subgraph exposes inputs `text, width, height, unet_name, clip_name1, clip_name2, vae_name, seed`,
but only `seed` has a link (link 77 -> KSampler 52 seed). The others are exposed but not connected;
their values come from widgets on the inner nodes.

## Subgraph nodes

| ID | Type | Widget values | Inputs from | Output to |
|---|---|---|---|---|
| 57 | UnetLoaderGGUF (ComfyUI-GGUF) | `flux1-dev-Q4_K_S.gguf` | - | 66 model |
| 58 | DualCLIPLoader | `clip_l.safetensors`, `t5xxl_fp8_e4m3fn.safetensors`, type `flux`, device `default` | - | 51 clip |
| 59 | VAELoader | `ae.safetensors` | - | 53 vae |
| 61 | PrimitiveNode "text" | **empty string** | - | 51 text |
| 51 | CLIPTextEncode (positive) | text from 61 (empty) | 58, 61 | 52 positive, 54 |
| 54 | ConditioningZeroOut (negative) | - | 51 | 52 negative |
| 63 | LoadImage (reference) | `clipspace-painted-masked-1790144092869.png` | - | 66 image (MASK unused) |
| 65 | IPAdapterFluxLoader (comfyui-ipadapter-flux) | `ip-adapter.bin`, `google/siglip-so400m-patch14-384`, provider `mps` | - | 66 ipadapter_flux |
| 66 | ApplyIPAdapterFlux | weight 1.0, start 0.0, end 1.0 | 57, 65, 63 | 52 model |
| 60 | EmptySD3LatentImage | 832 x 1216, batch 1 | - | 52 latent |
| 52 | KSampler | widget seed 53943644181156 `randomize` (overridden by link 77), steps 20, cfg 1.0, `euler`, `simple`, denoise 1.0 | 66, 51, 54, 60 | 53 |
| 53 | VAEDecode | - | 52, 59 | subgraph output, 62 |
| 62 | SaveImage | filename_prefix = `ComfyUI` | 53 | - |

IPAdapter link type is `IP_ADAPTER_FLUX_INSTANTX` (InstantX Flux IP-Adapter).
No LoRA, ControlNet or FluxGuidance node is present.

## Flow

UnetLoaderGGUF -> ApplyIPAdapterFlux (+ LoadImage reference, IPAdapterFluxLoader) -> KSampler
DualCLIPLoader + text -> CLIPTextEncode -> positive; ConditioningZeroOut -> negative
EmptySD3LatentImage -> KSampler -> VAEDecode -> SaveImage x2

## Findings

1. **Prompt is empty in the saved file.** Node 61 (and 51) hold `""`. The "completely new / different
   person" prompt seen earlier is not in this save. Section 31 decision (change prompt wording) has
   nothing to edit in this file; the app will supply the prompt.
2. **Reference image is a mask-editor temp file**: `clipspace-painted-masked-1790144092869.png`,
   not `woman_reference.jpg` (which is not in `ComfyUI/input/`). Clipspace files are temporary
   and fragile. Grace's approved identity reference should replace it (approved in Section 31).
3. **Image is saved twice per run**: node 9 (`Flux.1_Dev`) and node 62 (`ComfyUI`).
   The adapter should read one output node only.
4. **Seed**: the effective seed is the subgraph widget on node 56 (1012079273797201), not 0 as
   read from the screenshot. KSampler's own seed widget is overridden by the link.
5. **SigLIP** is referenced by Hugging Face repo id (`google/siglip-so400m-patch14-384`), so it is
   loaded from the HF cache, not `ComfyUI/models/`. Consistent with the `ls` output.
6. `FLUX_V1_BASELINE.json` has the identical graph. Differences: prompt (Viking warrior test
   prompt), outer seed, node layout, frontend version 1.53.6.

## Fields safe for the app to set (pending API export confirmation)

| Purpose | Node | Field |
|---|---|---|
| Positive prompt | 61 / 51 | `text` |
| Seed | 56 -> 52 | `seed` |
| Width / height | 60 | `width`, `height` |
| Reference image | 63 | `image` |
| IPAdapter strength | 66 | `weight`, `start_percent`, `end_percent` |
| Output prefix | 9 or 62 | `filename_prefix` |

Not to be changed without approval: model loaders (57, 58, 59, 65), sampler settings (52).

## Not verified

- That this workflow runs successfully (not executed).
- API-format node IDs.
- Which image `clipspace-painted-masked-1790144092869.png` shows.
