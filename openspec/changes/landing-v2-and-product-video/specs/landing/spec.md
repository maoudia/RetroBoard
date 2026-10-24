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
