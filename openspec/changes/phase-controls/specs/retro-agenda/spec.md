## ADDED Requirements

### Requirement: Capability policy per phase
Each phase SHALL carry a policy of on/off capabilities (write, publish, group, vote, actions, freeze) whose default is the recommended preset of the phase kind, so a board with no stored policy behaves as it did before. A facilitator SHALL be able to change the policy of any phase, running or not, and every replica SHALL apply the same policy to the same event log. Chat, the talk turn and the presenter SHALL never be governed by the policy.

#### Scenario: Default behaviour
- **WHEN** no facilitator has changed a policy
- **THEN** each phase allows exactly the commands it allowed before this change

#### Scenario: Write during Group
- **WHEN** a facilitator turns "write" on for the Group phase
- **THEN** participants can add ideas during Group and the other capabilities of the phase are unchanged

#### Scenario: Freeze
- **WHEN** a facilitator turns "freeze" on for the Rank phase
- **THEN** participants can change nothing governed by the policy during Rank, facilitators can, and the next phase applies its own policy

#### Scenario: Nothing published
- **WHEN** "publish" is off for the running phase
- **THEN** drafts stay private to their authors and the publish control shows the phase cue instead

#### Scenario: A participant tries
- **WHEN** a participant sends a policy change
- **THEN** the change is refused

#### Scenario: Reset
- **WHEN** a facilitator presses "Reset to recommended" on a phase
- **THEN** the stored policy of that phase is removed and the preset applies again

### Requirement: Same answer in the fold and in the interface
The interface gates, the vote bar and the availability cues SHALL read the same function as the command fold, so a control is enabled exactly when its command would be accepted.

#### Scenario: Gate and fold agree
- **WHEN** any phase kind, policy and command are combined
- **THEN** the control is enabled if and only if the command is accepted for a participant
