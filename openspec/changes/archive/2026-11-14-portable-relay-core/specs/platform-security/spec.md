# Spec Delta

## ADDED Requirements

### Requirement: Client address from a trusted source only
The page limiter MUST take the client address from the header named by the deployment's configuration, or from the socket address when none is configured, and MUST ignore a forwarding header that is not configured as trusted.

#### Scenario: Hosted deployment
- **WHEN** the deployment is configured to read the address from the edge header
- **THEN** the limiter keys on that header's value and a client cannot change its key by sending another forwarding header

#### Scenario: Untrusted forwarding header
- **WHEN** no forwarding header is configured and a request carries `X-Forwarded-For`
- **THEN** the limiter keys on the socket address and the header is ignored

## MODIFIED Requirements

### Requirement: Legal and privacy pages
The site SHALL provide a legal notice, a privacy page that lists what the relay and the hosting provider of that deployment can observe, and terms of use, in French and English, linked from every page footer. The operator and hosting provider named by the privacy page SHALL come from the deployment's configuration; the hosted service names its operator and Cloudflare.

#### Scenario: Privacy page content
- **WHEN** a visitor opens the privacy page
- **THEN** it lists room ids, IP addresses, connection times and message sizes as the only data visible to the service, and states that board content is end-to-end encrypted and not stored

#### Scenario: Self-hosted operator
- **WHEN** a self-hosted instance is configured with its operator's details
- **THEN** the privacy page names that operator and does not name Cloudflare as a processor
