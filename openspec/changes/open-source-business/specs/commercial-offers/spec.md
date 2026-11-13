# Spec Delta

## Purpose
What RetroBoard gives away and what it sells, as a visitor reads it: the free product, the paid plans, sponsorship and sponsorware, the enterprise self-host offer and MAIDAF's services, each on a page of the site or of the repository and always consistent with the one definition of the plans.

## ADDED Requirements

### Requirement: Offers page
The site SHALL provide an offers page in French and English, linked from the landing and the settings, that lists the free offer first with everything a team needs for a real retro, then each paid plan with its price including taxes as the payment provider shows it and what it adds, the one-off packs, the self-host and enterprise offers and the services, with a link to the source code and the license.

#### Scenario: Visitor compares plans
- **WHEN** a visitor opens the offers page
- **THEN** the free plan is listed first with writing, grouping, voting, actions and file exports, and each paid plan states its price and what it adds, in the visitor's language

### Requirement: Offers from the plan definitions
The plans and prices of the offers page SHALL come from the plan definitions shared with the checkout and the relay, and the page MUST NOT be published with prices the owner has not confirmed.

#### Scenario: Plan definition changes
- **WHEN** a limit or a price changes in the plan definitions
- **THEN** the offers page shows the new value at the next generation without a change to the page

#### Scenario: Prices not confirmed
- **WHEN** the owner has not confirmed the prices
- **THEN** the offers page is not linked from the site

### Requirement: Sponsorship and sponsorware
The project SHALL offer sponsorship tiers through GitHub Sponsors (`.github/FUNDING.yml`, a sponsors section in the README and on the offers page) and SHALL publish a sponsorware policy: a new theme or format reaches sponsors on the hosted service a fixed number of days before everyone, its code is public from its first commit, and the early access is granted by the entitlement token, never by withholding code.

#### Scenario: Sponsor opens a new theme early
- **WHEN** a theme is in its early-access window and a facilitator whose entitlement carries the sponsor claim creates a board
- **THEN** the theme is available to them, while a facilitator without the claim sees the theme announced with its public date

#### Scenario: Window ends
- **WHEN** the early-access window of a theme ends
- **THEN** every facilitator can use it without a change to the code

### Requirement: Enterprise self-host offer
The self-hosting documentation SHALL describe the enterprise offer in one section: what the free self-host allows (AGPL section 13), the commercial license without AGPL obligations, support and response times, private installation, branding on boards and reports, and how to contact MAIDAF EURL; the commercial license text SHALL be published only after the owner's legal review and SHALL be referenced from `NOTICE`.

#### Scenario: IT department evaluates
- **WHEN** an IT department reads `docs/self-hosting.md`
- **THEN** it finds what the free self-host allows, what the enterprise offer adds and whom to contact, in one section

### Requirement: Services page
The site SHALL provide a services page in French and English, "Facilitation and training", describing MAIDAF EURL's facilitation missions and training with a contact link, no form, no tracker and no third-party origin; claims about funding or certification (Qualiopi, OPCO) SHALL appear only once the owner has confirmed they apply.

#### Scenario: Visitor contacts
- **WHEN** a visitor chooses the contact link on the services page
- **THEN** their mail client or the owner's site opens, and no request left the site origin before that
