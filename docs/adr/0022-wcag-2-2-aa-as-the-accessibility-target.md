---
status: proposed
date: 2026-10-25
decision-makers: Moncef Aoudia
---

# WCAG 2.2 AA as the accessibility target

## Context and Problem Statement

The owner asked for support of an accessibility standard. The site runs axe on a few pages with WCAG 2.1 rules and has no stated target, no statement and no audit of the board itself. Which standard should RetroBoard conform to?

## Decision Drivers

* One target that covers the French and European references
* Checkable in CI, plus a short manual checklist
* No third-party widget or overlay (strict CSP, no tracker)

## Considered Options

* WCAG 2.2 level AA, with an accessibility statement
* WCAG 2.1 level AA (EN 301 549 and RGAA 4.1.2 baseline)
* RGAA 4.1.2 with a formal audit grid
* An accessibility overlay script

## Decision Outcome

Chosen option: "WCAG 2.2 level AA, with an accessibility statement", because WCAG 2.2 AA includes every WCAG 2.1 AA criterion (so it also meets the EN 301 549 and RGAA 4.1.2 baselines), adds the criteria that matter most for a drag-and-drop board (2.5.7 dragging, 2.5.8 target size, 2.4.11 focus not obscured), and is the base announced for RGAA 5. Overlays are rejected: they do not fix the markup and would add a third-party script.

### Consequences

* Good, because one target, tested by axe (`wcag22aa` tags) and a contrast unit test on every theme
* Good, because a statement page tells users what works and how to report a problem
* Bad, because artistic themes may need darker tokens, and manual screen-reader checks take time at each release

## More Information

* WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
* European Accessibility Act, Directive (EU) 2019/882; Article 4(5) exempts microenterprises providing services, so this is a quality goal, not a legal obligation today (to be checked again if the publisher grows): <https://www.legislation.gov.uk/eudr/2019/882/article/4>
* RGAA 4.1.2 is based on WCAG 2.1; RGAA 5 is announced on WCAG 2.2 for the end of 2026 (secondary source, to be verified on accessibilite.numerique.gouv.fr): <https://www.binclusive.io/en/blog/rgaa-5-france-digital-accessibility-standard>
* OpenSpec change: accessibility-wcag.
