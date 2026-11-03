# agent-sessions Specification

## Purpose
Agents contribute feedback to a retro inside a time box, clearly labelled and moderated.

## ADDED Requirements

### Requirement: Labelled agent feedback
Ideas added by an agent SHALL be marked as agent-authored and SHALL wait for facilitator approval before everyone sees them.

#### Scenario: Pending agent idea
- **WHEN** an agent adds an idea during a session
- **THEN** it is shown as pending to facilitators and hidden from others until approved

### Requirement: Time-boxed agent session
An agent session SHALL have a duration after which agent writes are rejected on every peer.

#### Scenario: Session ends
- **WHEN** the 10-minute session expires and the agent sends another idea
- **THEN** the idea is ignored and the session shows as closed
