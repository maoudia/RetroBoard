---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Remove protocol v1 and its server-side storage

## Context and Problem Statement

The first relay (protocol v1) reduced plaintext commands on the server and stored boards in SQLite, against the zero-storage rule. Protocol v2 (encrypted, memory only) replaced it.

## Considered Options

* Delete the Room class and its data with a wrangler migration (deleted_classes)
* Keep v1 for old links

## Decision Outcome

Chosen option: "Delete the Room class and its data with a wrangler migration (deleted_classes)", because keeping it would keep plaintext boards on a server.

### Consequences

* Good, because no server-side storage remains
* Bad, because old unencrypted links stop working (they show an explanation page)

## More Information

Durable Object migrations: <https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/>. Commit 1d2ad07.
