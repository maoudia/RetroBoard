## ADDED Requirements

### Requirement: Every mutant is detected or waived with a reason
Every mutant of the domain, application, protocol, crypto, exporters and sync packages SHALL be detected by a test, or be waived next to the code with a named mutator and a written reason. The waivers MUST NOT use `all`.

#### Scenario: A change leaves a mutant alive
- **WHEN** a commit changes a mutated source file and a mutant of it survives
- **THEN** `pnpm mutation:changed` lists it and exits with an error, locally before the push and on the pull request

#### Scenario: A waiver without a reason
- **WHEN** a `Stryker disable` comment has no named mutator or no reason
- **THEN** the unit tests fail

### Requirement: The main branch stays at 100%
The mutation ratchet SHALL compare every package with a floor of 100% once the packages reach it, and a run that leaves a mutant undetected MUST fail.

#### Scenario: Regression on main
- **WHEN** a run on main leaves one mutant undetected in a package
- **THEN** the Quality workflow fails and names the file and the line
