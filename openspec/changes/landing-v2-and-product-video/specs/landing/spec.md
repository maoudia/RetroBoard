## Purpose

Defines what the public landing page must communicate (value, openness of the code, pricing) and how its HTML product video behaves.

## ADDED Requirements

### Requirement: HTML product video
The landing page SHALL show a product walkthrough built from HTML and CSS animations of the real interface (create, share, write, group, vote, podium, actions), with captions in the page language, a pause control and a static storyboard when reduced motion is preferred.

#### Scenario: Reduced motion
- **WHEN** a visitor prefers reduced motion
- **THEN** the walkthrough is shown as a static sequence of captioned frames

### Requirement: Open code statement
The landing page SHALL state that RetroBoard is open source under the GNU AGPL-3.0, that anyone may self-host it, that modified versions offered as a service must publish their source, and that a commercial license is available, and SHALL link to the repository and the license.

#### Scenario: Visitor checks the license
- **WHEN** a visitor clicks the license link
- **THEN** the repository's LICENSE file opens

### Requirement: Pricing transparency
The landing page SHALL list what is free and what each paid plan adds, with prices including taxes for EU visitors as provided by the payment provider.

#### Scenario: Free plan
- **WHEN** a visitor reads the pricing section
- **THEN** the free plan lists agenda, voting, clusters, actions, exports and up to 15 participants

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
