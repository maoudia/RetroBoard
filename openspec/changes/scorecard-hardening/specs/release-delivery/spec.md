## ADDED Requirements

### Requirement: Signed release assets
Every GitHub Release SHALL carry the static build as an archive, its CycloneDX SBOM, keyless signatures of both and the build provenance, so that anyone can verify what they download.

#### Scenario: Release assets
- **WHEN** a release is published
- **THEN** it lists `retroboard-<version>-static.tar.gz`, its SBOM, and `.sigstore.json` signature bundles for each

#### Scenario: Verification
- **WHEN** a user runs the documented `cosign verify-blob` command on the archive
- **THEN** it succeeds and names the Release workflow of this repository as signer

#### Scenario: Unsigned build
- **WHEN** signing or provenance fails
- **THEN** the release job fails and no unsigned asset is attached
