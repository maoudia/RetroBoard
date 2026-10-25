---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Edge protection instead of a captcha

## Context and Problem Statement

ADR-0004 planned Turnstile at board creation. The owner asked for protection against abuse and DDoS, and asked whether Cloudflare Access fits.

## Decision Drivers

* No third-party script (strict CSP)
* The link is the invitation (no login)
* Free plan

## Considered Options

* Cloudflare automatic DDoS mitigation, one rate-limiting rule on /ws2, Under Attack Mode on demand, relay budgets
* Turnstile at board creation
* Cloudflare Access in front of the site

## Decision Outcome

Chosen option: "Cloudflare automatic DDoS mitigation, one rate-limiting rule on /ws2, Under Attack Mode on demand, relay budgets", because it protects without a widget, without accounts and without a paid plan.

### Consequences

* Good, because the CSP stays strict and joining stays one click
* Bad, because a determined abuser with the link can still join (key rotation handles that: facilitator-moderation)

## More Information

* Rate limiting rules (free: 1 rule, 10 s period): <https://developers.cloudflare.com/waf/rate-limiting-rules/>
* DDoS protection: <https://developers.cloudflare.com/ddos-protection/>
