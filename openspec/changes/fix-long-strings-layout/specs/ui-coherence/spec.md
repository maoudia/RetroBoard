## ADDED Requirements

### Requirement: Long strings stay inside their container
In a language 40 % longer than French, and with the layout mirrored, segmented choices and rows of the Options and Profile dialogs SHALL stay inside the dialog at 360 px, and the phase line SHALL end in an ellipsis rather than be cut.

#### Scenario: Options dialog in the pseudo-locale on a phone
- **WHEN** the Options dialog opens at 360 px in the pseudo-locale
- **THEN** no control extends beyond the dialog body
