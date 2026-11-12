# Spec Delta

## Purpose

The behaviour of a relay room that every runtime (Cloudflare Durable Object, Node process, any future host) must reproduce identically: admission of a socket, welcome and history, peer announcements, fan-out, signalling, refusals and close codes, with no dependency on a runtime API.

## ADDED Requirements

### Requirement: Runtime-neutral room core
The room logic of the relay MUST be expressed over a minimal socket port (send a text, close with a code and a reason, read and write a small per-connection attachment) and a clock, and MUST NOT import a Cloudflare, Node or browser runtime API. An architecture check SHALL fail when the core gains such an import.

#### Scenario: Core imports stay inside the core
- **WHEN** the architecture check runs
- **THEN** every import of the relay core resolves to the core itself or to the `protocol` and `domain` packages, and a `cloudflare:` or `node:` import in the core fails the check

#### Scenario: No server-side storage
- **WHEN** the storage guard test reads the relay core and the Cloudflare adapter
- **THEN** neither references the Durable Object storage API, alarms, KV, D1 or R2

### Requirement: Identical frames on every runtime
Every adapter MUST produce, for the same sequence of connections and client frames, the same relay frames in the same order and the same close codes as the Cloudflare deployment produces today.

#### Scenario: Welcome of a new connection
- **WHEN** a socket is admitted into a room
- **THEN** it receives a `welcome` frame carrying its connection id and the sorted ids of every connection of the room including its own, then the buffered history as `hist` frames whose last one is marked `done`, and every connection of the room (the new one included) receives a `peers` frame with the same sorted ids

#### Scenario: Peer leaves
- **WHEN** a connection closes or errors
- **THEN** every remaining connection receives a `peers` frame without the departed id

#### Scenario: Board frame fan-out and buffering
- **WHEN** a connection sends a `pub` frame whose envelopes all belong to its room
- **THEN** the envelopes not seen before are buffered and forwarded as one `env` frame to every other connection, and already seen envelopes are neither buffered again nor forwarded

#### Scenario: Live frame fan-out
- **WHEN** a connection sends an `eph` frame for its room
- **THEN** every other connection receives it and the sender does not, and nothing is buffered

#### Scenario: Signalling to one peer
- **WHEN** a connection sends a `sig` frame addressed to another connection id of the room
- **THEN** only that connection receives a `sig` frame carrying the sender's connection id, nothing is buffered, and a `sig` addressed to an unknown or to the sender's own id is dropped silently

#### Scenario: Wrong room
- **WHEN** a frame carries an envelope whose room differs from the connection's room
- **THEN** the sender receives `err` with code `wrong-room` and nothing is forwarded

#### Scenario: Invalid frame
- **WHEN** a connection sends text that is not a client frame
- **THEN** the sender receives `err` with code `invalid`

### Requirement: Refusals and close codes
The room MUST refuse the thirty-first connection, a frame over the size limit and a connection over its board-frame budget exactly as today: an `err` frame with code `full` then close 4008; close 1009 `Message too large`; close 1008 `Rate limit`. Live frames over their budget are dropped without closing.

#### Scenario: Board is full
- **WHEN** a room already holds the maximum number of connections and another socket arrives
- **THEN** the new socket receives `err` with code `full`, is closed with code 4008, and is never counted among the room's connections

#### Scenario: Message too large
- **WHEN** a connection sends a message longer than the frame limit
- **THEN** the connection is closed with code 1009

#### Scenario: Board frames over budget
- **WHEN** a connection exceeds its board-frame budget inside the rate window
- **THEN** the connection is closed with code 1008, while excess `eph` frames of another connection are dropped and its socket stays open

### Requirement: Liveness ping
Every adapter MUST answer the text message `ping` with the text message `pong` without counting it against any budget.

#### Scenario: Ping
- **WHEN** a connection sends the text `ping`
- **THEN** it receives the text `pong` and its budgets are unchanged

### Requirement: Content-free room logs
The core MUST log only event names, a short room hash and counts: never the room id, a connection id, an origin, a URL or any payload.

#### Scenario: Log fields
- **WHEN** a connection opens, sends envelopes, is refused or is closed over budget
- **THEN** the log lines carry the event name, the short room hash and at most a count, and none of them contains the room id, the connection id or the message body
