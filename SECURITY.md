# Security Policy

## Supported Versions

The MVP collector is currently maintained on the latest public release only.

## Reporting a Vulnerability

Please do not publish live collector tokens, private server credentials, or
exploit details in public issues.

Report security problems privately to the project maintainers first. Include:

- collector version;
- parser version;
- operating system;
- reproduction steps;
- relevant redacted logs.

## Secrets

Never commit:

- `starcitizen-collector.json`;
- collector tokens;
- `.pfx`, `.pem`, `.key`, or certificate private key files;
- local test credentials.

## Code Signing

Unsigned Windows installers can trigger SmartScreen warnings. This repository is
prepared for a public open-source code-signing request, but a trusted signature
requires a real code-signing certificate or an approved signing service.

Self-signed certificates are useful for local testing only and do not solve
trust warnings for external players.
