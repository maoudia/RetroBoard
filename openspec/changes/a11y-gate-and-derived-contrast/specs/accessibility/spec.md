## MODIFIED Requirements

### Requirement: Conformance target
The site SHALL target WCAG 2.2 level AA on every page and dialog, in every theme and variant, on phones and desktops.

#### Scenario: Automated gate
- **WHEN** a pull request changes the web app
- **THEN** axe with WCAG 2.2 A and AA rules runs on Chromium on every route and dialog in the push gate, and any violation fails the build

#### Scenario: Theme contrast
- **WHEN** a theme token makes text on a note colour fall below 4.5:1
- **THEN** the theme test fails

#### Scenario: Forced colours
- **WHEN** the operating system forces a colour palette
- **THEN** notes keep a visible boundary, and pressed and focused controls stay distinguishable
