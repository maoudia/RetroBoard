---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Integrations run in the browser

## Context and Problem Statement

Teams want results in Jira, Confluence, Google and Slack without us storing secrets or tokens.

## Decision Drivers

* No secrets, no tokens, no storage

## Considered Options

* Structured files, rich clipboard, deep links and user-provided webhooks, all in the browser
* OAuth apps through the Worker

## Decision Outcome

Chosen option: "Structured files, rich clipboard, deep links and user-provided webhooks, all in the browser", because it needs no secrets, no tokens, no storage and no app reviews.

### Consequences

* Good, because nothing passes through our servers
* Bad, because no automatic sync with those tools
