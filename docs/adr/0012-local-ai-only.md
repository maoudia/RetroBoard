---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Local AI only

## Context and Problem Statement

AI helpers (cluster titles, summaries) must not cost money or send board content anywhere.

## Considered Options

* Local AI only (Chrome Prompt API, Ollama or LM Studio on localhost, WebLLM)
* Hosted LLM

## Decision Outcome

Chosen option: "Local AI only (Chrome Prompt API, Ollama or LM Studio on localhost, WebLLM)", because it costs nothing and no data leaves the participant's machine.

### Consequences

* Good, because private by construction
* Bad, because quality depends on the participant's device
