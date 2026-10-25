---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# End-to-end encryption with keys in the link

## Context and Problem Statement

Board content must stay confidential while the service stores nothing and costs nothing.

## Decision Drivers

* Real confidentiality
* No accounts, no server storage

## Considered Options

* End-to-end encryption (AES-GCM 256, key in the URL fragment), optional passcode, facilitator capability key
* Server-checked passcode
* Secret link only, plaintext on the relay

## Decision Outcome

Chosen option: "End-to-end encryption (AES-GCM 256, key in the URL fragment), optional passcode, facilitator capability key", because it is the only option that is free, storage-free and confidential.

### Consequences

* Good, because the relay and Cloudflare only see ciphertext
* Bad, because a lost link cannot be recovered by anyone

## More Information

The original decision also added Turnstile at board creation; ADR-0019 removed it.
