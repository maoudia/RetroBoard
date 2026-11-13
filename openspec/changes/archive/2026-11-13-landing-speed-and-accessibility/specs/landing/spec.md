## Purpose

Defines what the public landing page must communicate and how fast it must be served.

## ADDED Requirements

### Requirement: Landing performance budget
The landing page SHALL be served with its content prerendered in the HTML (hero, sections, footer), so that the first paint and the largest contentful paint do not wait for any script, SHALL carry no inline style attribute (strict CSP) and no store state in its payload, and SHALL reach a Lighthouse performance score of at least 95 and an accessibility score of 100 on the mobile profile (`pnpm lighthouse`).

#### Scenario: First paint without scripts
- **WHEN** a visitor requests the landing page
- **THEN** the HTML answer already contains the hero title and subtitle, and the page is readable before any script runs

#### Scenario: Lighthouse mobile
- **WHEN** `pnpm lighthouse` audits the landing on the mobile profile
- **THEN** the performance score is at least 95 and the accessibility score is 100, in light and in dark

#### Scenario: Visitor language
- **WHEN** a visitor whose browser prefers English opens the prerendered French landing
- **THEN** the page switches to English as soon as the script has settled, on the same markup, and no local setting is replaced by the build-time snapshot
