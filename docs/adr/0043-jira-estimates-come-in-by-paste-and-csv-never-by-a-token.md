---
status: proposed
date: 2026-11-20
decision-makers: Moncef Aoudia
---

# Jira estimates come in by paste and CSV, never by a token we hold

## Context and Problem Statement

A poker room needs stories, and teams keep them in Jira. The project's rules say integrations run in the browser with no OAuth secrets and no tokens stored by us, the content security policy allows no third-party origin (one exception, ADR-0033), and nothing readable goes to a server of ours. Reports from the Atlassian community say that calling the Jira Cloud REST API from a page with an API token is generally blocked by CORS, and that the route that works from a page is OAuth 2.0 (3LO), which needs a registered app and, as far as is known, a secret for the code exchange. These points are to be confirmed by task 1.1 of `jira-estimation-import`. See that change.

## Decision Drivers

* No secret, token or account held by us
* No new origin in `connect-src` without its own decision
* Useful to a team on the first day, with no registration by the owner

## Considered Options

* Direct Jira API calls with a token the user pastes
* OAuth 2.0 (3LO) through a token-exchange endpoint on our Worker
* paste and CSV in, table and CSV out (a pasted Jira list, a Jira CSV export or issue keys in; a table and a CSV keyed by issue key out; estimates written into Jira by a human)

## Decision Outcome

Chosen option: "paste and CSV in, table and CSV out", because it needs no secret, no origin and no registration, works for Jira Cloud, Server and Data Center alike, and is a complete product. A direct read or write-back is allowed only if the spike finds a route that needs no secret of ours and no new origin; otherwise it is recorded as not pursued. Any new origin gets its own ADR, in the pattern of ADR-0033.

### Consequences

* Good, because the privacy position stays intact and nothing needs to be maintained against Atlassian's API changes
* Good, because the same importer can later read GitHub, Linear and Azure DevOps CSVs
* Bad, because the team does two clipboard moves per session instead of none

## More Information

Related: ADR-0033, ADR-0042, `openspec/config.yaml` (integrations constraint). Revisit if Atlassian documents a browser-safe, secret-free flow.
