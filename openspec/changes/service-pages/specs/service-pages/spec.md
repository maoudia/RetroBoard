## ADDED Requirements

### Requirement: Not found page
The system SHALL answer an unknown path with a branded page and the HTTP status 404, offering links to create a board and to the landing page, and suggesting the closest known page when the path looks like a typo.

#### Scenario: Typo in the URL
- **WHEN** a visitor opens /nwe
- **THEN** the response status is 404 and the page suggests "/new"

### Requirement: Error page
The system SHALL replace unexpected client errors with a branded page offering to reload and showing a short error id, without technical details or board data.

#### Scenario: Unexpected error
- **WHEN** a component throws while rendering the board
- **THEN** the visitor sees "Something went wrong", a Reload button and an error id

### Requirement: Unavailable states
The system SHALL show a dedicated page when the network is offline, when the browser lacks a required capability, when a board link is invalid, retired or closed, and when the service is under maintenance or rate-limiting the visitor, each saying what happened and what to do next.

#### Scenario: Offline with a local copy
- **WHEN** a participant opens the site without network and has a recent board stored locally
- **THEN** the offline page lists that board and opens it read-only

#### Scenario: Maintenance
- **WHEN** the owner sets MAINTENANCE=1 on the Worker
- **THEN** pages answer 503 with Retry-After and the maintenance page, while /healthz still answers

#### Scenario: Too many requests
- **WHEN** the edge or the relay limits a visitor
- **THEN** the visitor sees a page with a retry countdown instead of a blank connection error

### Requirement: Correct status for every client
The Worker SHALL return the branded HTML page to browser navigations and a short text body to other clients, with the same status code in both cases.

#### Scenario: Script calls a wrong URL
- **WHEN** a script requests /api/unknown without accepting HTML
- **THEN** the response is 404 with a plain-text body

### Requirement: Accessible and localised
Every service page SHALL be available in French and English, readable from 360 px phones to TVs, in light and dark, and SHALL pass the accessibility audit.

#### Scenario: English visitor
- **WHEN** an English browser opens an unknown path
- **THEN** the 404 page is in English and passes axe
