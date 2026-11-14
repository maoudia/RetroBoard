# self-hosting Specification

## Purpose
Running RetroBoard outside Cloudflare: the published image runs the relay and serves the site on plain Node, with the same externally visible behaviour as the hosted service, proven by the same contract tests.

## Requirements

### Requirement: Node runtime
The published container image SHALL run the site and the relay on Node without Wrangler or workerd, and SHALL answer `/healthz` with `ok` within five seconds of starting.

#### Scenario: Container starts
- **WHEN** the published image is started with its default command
- **THEN** `/healthz` answers `ok` over HTTP within five seconds and the process holds no Cloudflare runtime

#### Scenario: Image contents
- **WHEN** the image is inspected
- **THEN** it holds the static site, the relay bundle and its one WebSocket dependency, and no Wrangler or workerd binary

### Requirement: Same behaviour as the hosted service
A self-hosted instance MUST serve the static site with the asset-layer rules of the hosted service (exact file, `.html` fallback, directory index, branded 404 for an unknown path, a missing hashed asset is a 404 that is not HTML), MUST apply the same security headers and CSP, and MUST run the same relay core.

#### Scenario: Contract suite on the Node adapter
- **WHEN** the smoke script and the core end-to-end suite run against a Node instance
- **THEN** they pass with the results they produce against the Cloudflare development runtime

#### Scenario: Security headers
- **WHEN** a page or a file is requested from a self-hosted instance
- **THEN** the answer carries the same security headers as the hosted service and the HTML carries the same Content-Security-Policy

### Requirement: Node adapter hardening
The Node adapter MUST bound what one client can cost it: a per-socket payload limit equal to the frame limit, a ping and idle timeout that closes a silent socket, a backpressure guard, a per-address connection cap and connect rate, and a graceful drain on termination that closes every socket with code 1001.

#### Scenario: Idle socket
- **WHEN** a socket sends nothing and answers no ping within the idle timeout
- **THEN** the adapter closes it and the room announces the departure

#### Scenario: Graceful stop
- **WHEN** the process receives a termination signal
- **THEN** every socket is closed with code 1001, the listener stops accepting and the process exits within the drain period

#### Scenario: Oversized payload
- **WHEN** a client sends a WebSocket message above the frame limit
- **THEN** the socket is closed with code 1009 and the process keeps serving the other sockets

### Requirement: URL-free logs on self-hosted instances
The Node adapter MUST NOT write the request URL or its query string to its logs, and the self-hosting guide SHALL show how to configure the reverse proxy so that the room id in the WebSocket query string is not logged either.

#### Scenario: Log review on a self-hosted instance
- **WHEN** a board is used end to end against a Node instance
- **THEN** the adapter's log lines contain event names, statuses and short room hashes only, and no URL

### Requirement: Room affinity across instances
The self-hosting guide SHALL state that one instance serves all sockets of one room, and SHALL give a proxy configuration that routes by the `room` query parameter for deployments with several instances.

#### Scenario: Documented recipe
- **WHEN** an operator reads the self-hosting guide
- **THEN** it states the single-instance rule and gives at least one proxy recipe keyed on the `room` parameter
