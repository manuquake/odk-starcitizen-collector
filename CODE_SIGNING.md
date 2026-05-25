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
