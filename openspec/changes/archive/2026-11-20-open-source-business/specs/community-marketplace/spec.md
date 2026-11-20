# Spec Delta

## Purpose
How themes and retro formats made by the community enter the product, are reviewed and are paid: the contribution format, the review rules and the revenue share, so that creators know the deal before they start.

## ADDED Requirements

### Requirement: Contribution format
A community theme or format SHALL be contributed as a pull request that adds a self-contained pack (theme tokens, fonts under the SIL Open Font License, effects as CSS or SVG, templates in French and English, a preview image and a `pack.json` with name, author, license and price class) validated by the existing theme contrast tests and a pack check; a pack MUST NOT execute script or load a remote resource.

#### Scenario: Pack with a remote font
- **WHEN** a contributed pack references a font by URL
- **THEN** the pack check fails and names the file

#### Scenario: Pack passes
- **WHEN** a pack passes the contrast tests, the pack check, the intellectual property checklist and a maintainer review
- **THEN** it is merged, listed in the catalogue and published on the hosted service with the next release

### Requirement: Review rules and intellectual property
Every pack SHALL pass the intellectual property checklist (no franchise name, logo, character, quote, music, font or recognisable design; original art only; the name checked against trademark databases) and a maintainer review before publication, and the checklist result SHALL be recorded in the pull request.

#### Scenario: Pack named after a franchise
- **WHEN** a pack's name or art refers to a protected franchise
- **THEN** the review refuses it and names the checklist item that failed

### Requirement: Revenue share
A paid pack SHALL be sold through the merchant of record of the entitlements, the creator SHALL receive the published share of the net revenue (after the merchant's fees and taxes) at a published cadence, and the share, the cadence and the price classes SHALL be stated in `docs/marketplace.md` before the first pack is accepted; a free pack SHALL stay free for everyone, including self-hosters.

#### Scenario: Creator reads the deal
- **WHEN** a creator opens `docs/marketplace.md`
- **THEN** they find the share, the payout cadence, the price classes, the contribution format and the review rules
