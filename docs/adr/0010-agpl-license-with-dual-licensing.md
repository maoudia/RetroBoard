---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# AGPL-3.0-only with dual licensing

## Context and Problem Statement

The code is open, but closed resale of a modified hosted version should not be possible for free.

## Decision Drivers

* OSI open source
* Discourage closed resale

## Considered Options

* AGPL-3.0-only plus a commercial license on request, contributions under a CLA
* MIT
* FSL-1.1-ALv2
* BSL 1.1 or Elastic 2.0

## Decision Outcome

Chosen option: "AGPL-3.0-only plus a commercial license on request, contributions under a CLA", because it is real open source and anyone running a modified version as a service must publish its source (AGPL section 13).

### Consequences

* Good, because protects against closed resale
* Bad, because some companies avoid AGPL dependencies; external contributors must sign a CLA

## More Information

Commits up to tag `last-mit` stay MIT. AGPL: <https://www.gnu.org/licenses/agpl-3.0.html>.
