---
status: accepted
date: 2026-11-19
decision-makers: Moncef Aoudia
---

# PolyForm Noncommercial 1.0.0, source available and closed to outside contributions

## Context and Problem Statement

RetroBoard is a project built in public and a portfolio piece. The owner wants it free to read, run and share, with no commercial use by others and the commercial rights kept for the future. ADR-0010 chose AGPL-3.0-only with a commercial license on request and a CLA, which allows commercial use by anyone who accepts the AGPL and needs a CLA to keep dual licensing open.

## Decision Drivers

* No commercial use by others, commercial rights reserved to the owner
* Public source, free to read, run, modify and share
* No outside contributions, so no CLA to run

## Considered Options

* PolyForm Noncommercial 1.0.0
* Keep AGPL-3.0-only with the CLA
* FSL-1.1-ALv2 or BSL 1.1 (commercial use allowed except competing, then converts to open source)

## Decision Outcome

Chosen option: "PolyForm Noncommercial 1.0.0", because it forbids commercial use outright, is a standard text, and needs no contributor agreement once outside contributions are closed.

* `LICENSE` is the PolyForm Noncommercial 1.0.0 text; `package.json` files, the container image labels and `NOTICE` carry the SPDX id `PolyForm-Noncommercial-1.0.0`.
* RetroBoard is described as "source available" and "built in public", never as "open source": the license is not OSI approved.
* Versions up to and including v1.56.0 were published under AGPL-3.0-only and stay under it for the recipients who already have them; commits up to the `last-mit` tag stay MIT. The new license applies to the versions after v1.56.0.
* Outside contributions are not accepted (issues are welcome). The CLA (`docs/CLA.md`, the `CLA` workflow and `scripts/ci/cla-check.mjs`) is retired.
* The OpenSpec changes `open-source-business` and `licensing-and-monetization` are shelved.

This supersedes ADR-0010.

### Consequences

* Good, because commercial use by others is excluded and the owner keeps every commercial right
* Good, because there is no CLA to administer
* Bad, because it is not open source: some users and tools exclude non-OSI licenses, and no outside code can come in
* Bad, because dependencies licensed GPL or AGPL can no longer be combined with the code; the production license check allows permissive and weak-copyleft licenses only

## More Information

PolyForm Noncommercial 1.0.0: <https://polyformproject.org/licenses/noncommercial/1.0.0>.
