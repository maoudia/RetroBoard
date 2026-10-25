---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Payments through a merchant of record

## Context and Problem Statement

Paid plans need payments and sales tax handling without a customer database.

## Considered Options

* Merchant of record (Polar) plus stateless signed entitlement tokens
* Own Stripe integration with a customer database

## Decision Outcome

Chosen option: "Merchant of record (Polar) plus stateless signed entitlement tokens", because the merchant of record is the system of record and handles sales tax.

### Consequences

* Good, because no customer database on our side
* Bad, because fees of the merchant of record

## More Information

On hold: monetisation is postponed (owner decision 2026-10-24). Polar: <https://polar.sh/docs/fees>.
