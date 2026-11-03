# Proposal

## Why
Owner feedback 2026-11-03: a funny retro companion running on local LLMs. `local-ai-companion` covers the serious companion (summaries, clustering hints); this change adds the playful persona on top, with the same privacy model.

## What Changes
- A companion persona selectable per board ("Coach", "Pirate", "Zen monk" ...) that offers icebreakers, gentle jokes between phases and encouragement, never about a person's content.
- Runs only on a local model (Ollama or WebLLM in the browser), opt-in; nothing leaves the device; off by default.
- Works without a model through a small bank of fixed fr and en lines (fallback).

## Capabilities
### New Capabilities
- `companion-persona`: playful local companion.
### Modified Capabilities
<!-- none -->

## Impact
Depends on `local-ai-companion` for the model port. UI: companion bubble, preference. Model weights are never bundled (size budget); the user brings or downloads them. Spec only for now.
