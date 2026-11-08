## MODIFIED Requirements

### Requirement: Cluster colour
A participant SHALL be able to recolour a whole cluster at once from the group menu on the stack and from the cluster panel, with the same quick swatches and the same full palette (including the extended shades) as a note, in one command, which recolours every note of the cluster except the frozen ones.

#### Scenario: Recolour a cluster
- **WHEN** Alice picks blue for the cluster "Deploys"
- **THEN** every note of the cluster turns blue for everyone

#### Scenario: Extended shades for a cluster
- **WHEN** Alice opens the palette for a cluster and chooses more shades
- **THEN** she sees the same 24 theme shades as for a note, and choosing one recolours the notes of the cluster

#### Scenario: Cluster already in an extended shade
- **WHEN** Alice opens the palette of a cluster whose notes are in an extended shade
- **THEN** the palette opens with more shades shown and the current shade checked

#### Scenario: Frozen notes keep their colour
- **WHEN** a cluster contains a frozen note and Alice recolours the cluster
- **THEN** the frozen note keeps its colour and the other notes change
