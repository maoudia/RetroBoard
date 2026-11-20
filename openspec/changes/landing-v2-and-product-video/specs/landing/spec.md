## Purpose

Defines what the public landing page must communicate (value, openness of the code) and how its HTML product video behaves.

## ADDED Requirements

### Requirement: HTML product video
The landing page SHALL show a product walkthrough built from HTML and CSS animations of the real interface (create, share, write, group, vote, podium, actions), with captions in the page language, a pause control and a static storyboard when reduced motion is preferred.

#### Scenario: Reduced motion
- **WHEN** a visitor prefers reduced motion
- **THEN** the walkthrough is shown as a static sequence of captioned frames

### Requirement: Open code statement
The landing page SHALL state that RetroBoard is built in public and source available under the PolyForm Noncommercial License 1.0.0 (not open source), that anyone may self-host it for noncommercial use, and that commercial rights are reserved to the author, and SHALL link to the repository and the license.

#### Scenario: Visitor checks the license
- **WHEN** a visitor clicks the license link
- **THEN** the repository's LICENSE file opens
