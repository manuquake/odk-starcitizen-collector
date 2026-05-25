# Code Signing

## Goal

The goal is to distribute a Windows collector that is transparent, verifiable,
and signed.

## Open Source Signing

Publishing this project as open source can make it eligible for free or
sponsored signing programs, for example SignPath Foundation. Approval is not
automatic and usually requires:

- a public source repository;
- an OSI-approved license;
- documented build and release process;
- documented privacy/security behavior;
- maintainer account security, usually including MFA;
- no committed secrets.

## Important Clarification

Open source status does not automatically create a trusted Windows certificate.
It only makes the project eligible to apply for some signing programs.

## Self-Signed Certificates

Self-signed certificates are not suitable for public player distribution.
Windows will not trust them unless every player manually installs the root
certificate, which is not a good security model.

## Recommended Path

1. Publish this repository publicly.
2. Tag a clean release.
3. Apply for an open-source signing program.
4. Configure release signing through the approved provider.
5. Publish SHA-256 checksums and signed installer artifacts.

## Signing Policy

Artifacts eligible for signing:

- `ODK-StarCitizen-Collector-Setup.exe`

Artifacts not intended for signing:

- local configs;
- collector tokens;
- screenshots;
- portable zip archives, unless a signing provider explicitly supports detached
  signatures.

Release signing requirements:

- release must be based on a public Git tag;
- build must be reproducible from repository scripts;
- repository owner must approve the release;
- release notes must identify whether the installer is signed;
- SHA-256 checksums must be published.

If SignPath Foundation signing is approved, signed release pages must include:

```text
Free code signing provided by SignPath.io, certificate by SignPath Foundation.
```
