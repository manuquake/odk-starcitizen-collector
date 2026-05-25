# Open Source Release Checklist

Use this checklist before publishing or tagging a release.

## Repository

- [ ] Repository is public.
- [ ] Default branch is protected where possible.
- [ ] Maintainers have MFA enabled.
- [ ] License is present and OSI-approved.
- [ ] README explains what the collector reads and sends.
- [ ] Privacy and security docs are present.
- [ ] No local config or collector token is committed.

## Secrets

- [ ] No `starcitizen-collector.json`.
- [ ] No `token-test.txt`.
- [ ] No `.pfx`, `.pem`, `.key`, or private certificate material.
- [ ] No real collector IDs or collector tokens in docs.
- [ ] No private backend admin credentials.

## Build

- [ ] `npm run check` passes.
- [ ] Release artifact is built from this repository.
- [ ] Release artifact SHA-256 is published.
- [ ] Installer is signed before public distribution when signing is available.
- [ ] Release page states the code signing status.
- [ ] If SignPath is used, release page includes the required SignPath credit.

## Code Signing Application

- [ ] Public repository URL is available.
- [ ] Release process is documented.
- [ ] Privacy behavior is documented.
- [ ] Signing scope is clear: Windows collector installer only.
- [ ] Maintainer contact is set.
