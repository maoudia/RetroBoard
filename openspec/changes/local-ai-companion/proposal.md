# Proposal

## Why

A small, funny retro companion and a time-box assistant make retros lighter and keep them on time. It must cost nothing and leak nothing, so it runs on the participant's machine.

## What Changes

- Facilitator bot without AI: phase reminders, overtime nudges, wrap-up checklist, automatic report at the end.
- Optional local AI providers behind one port: Chrome Prompt API, Ollama or LM Studio on localhost (OpenAI-compatible), WebLLM in the browser.
- Companion persona (playful, themed with the board theme) that comments on phase changes and celebrates, configurable or muted.
- AI helpers: cluster titles, duplicate detection, SMART action phrasing, narrative summary for the report.
- Everything opt-in per participant; nothing is sent to remote AI services.

Out of scope: hosted LLMs, voice.

## Capabilities

### New Capabilities

- `ai-companion`: facilitator bot, local AI providers and the helpers they power.

### Modified Capabilities

None.

## Impact

- `LlmPort` in application, adapters in web; no server change.
