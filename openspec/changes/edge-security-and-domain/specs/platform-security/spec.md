## ADDED Requirements

### Requirement: Transport security
The site MUST be served only over HTTPS on `retroboard.maoudia.com` with HSTS (max-age at least 15552000 seconds) and MUST redirect plain HTTP to HTTPS.

#### Scenario: Plain HTTP request
- **WHEN** a browser requests `http://retroboard.maoudia.com/`
- **THEN** it is redirected to the HTTPS URL and the response carries a Strict-Transport-Security header

### Requirement: Security contact
The site SHALL publish `/.well-known/security.txt` with a contact, an expiry date and the preferred language.

#### Scenario: Researcher looks for a contact
- **WHEN** someone requests `/.well-known/security.txt`
- **THEN** a valid security.txt document is returned with a non-expired Expires field

### Requirement: Legal and privacy pages
The site SHALL provide a legal notice, a privacy page that lists what the relay and Cloudflare can observe, and terms of use, in French and English, linked from every page footer.

#### Scenario: Privacy page content
- **WHEN** a visitor opens the privacy page
- **THEN** it lists room ids, IP addresses, connection times and message sizes as the only data visible to the service, and states that board content is end-to-end encrypted and not stored
