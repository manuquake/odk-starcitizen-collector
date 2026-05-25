# SignPath Application Notes

These notes are intended to help with a future open-source code-signing
application.

## Project Summary

ODK Star Citizen Collector is a local Windows companion collector for Star
Citizen community operations. It reads the local `Game.log` file and sends
parsed events to an ODK backend selected by the user.

## Why Signing Is Needed

The project is distributed to players who need to run a local collector while
playing. Unsigned Windows executables trigger SmartScreen and trust warnings.
Signing improves safety by making the released installer tamper-evident and
identifiable.

## Security Model

The collector:

- does not read process memory;
- does not inject into Star Citizen;
- does not modify game files;
- does not include a preconfigured token;
- stores the user's collector token locally in AppData;
- sends only parsed log events, heartbeat metadata, and optional screenshot
  proofs when enabled.

## Artifacts To Sign

- `ODK-StarCitizen-Collector-Setup.exe`

Portable zip files can be distributed with SHA-256 hashes, but the primary
player-facing artifact should be the signed installer.

## Release Branch/Tag

Recommended pattern:

- branch: `main`
- tags: `v0.2.0`, `v0.2.1`, ...

## Maintainer Notes

Before applying, make sure the repository is public, has an OSI-approved
license, and has no committed credentials.
