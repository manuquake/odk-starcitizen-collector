# SignPath Foundation Application Draft

## Project name

ODK Star Citizen Collector

## Repository

https://github.com/Manuquake/odk-starcitizen-collector

## Release

https://github.com/Manuquake/odk-starcitizen-collector/releases/tag/v0.2.0

## License

MIT

## Short description

ODK Star Citizen Collector is a local Windows companion collector for Star
Citizen community operations. It reads the local Star Citizen `Game.log` file
and sends parsed events to an ODK backend configured by the user.

## Why code signing is needed

The project is distributed to players who need to run a local collector while
playing Star Citizen. Unsigned Windows executables trigger SmartScreen and
unknown-publisher warnings. Code signing makes the installer tamper-evident and
helps users verify that it comes from the open-source project release process.

## What the application does

- Reads the configured Star Citizen `Game.log` file.
- Sends parsed telemetry events and heartbeat status to the configured backend.
- Optionally watches the Star Citizen `ScreenShots` folder for proof uploads
  when screenshot proofs are enabled in configuration.
- Stores the collector token locally in the user's AppData folder.

## What the application does not do

- It does not read Star Citizen process memory.
- It does not inject code into Star Citizen.
- It does not modify Star Citizen files.
- It does not read browser cookies, Discord tokens, or passwords.
- It does not include a preconfigured collector token.

## Artifact to sign

`ODK-StarCitizen-Collector-Setup.exe`

## Build command

```powershell
npm run build:windows-installer
```

## Code signing policy

Release signing is limited to official Windows installer artifacts built from a
public tag in this repository. The repository owner approves releases. External
contributions must be reviewed before release. SHA-256 hashes are published with
release artifacts.

The repository includes:

- `README.md`
- `LICENSE`
- `PRIVACY.md`
- `SECURITY.md`
- `CODE_SIGNING.md`
- `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md`

## Privacy policy

https://github.com/Manuquake/odk-starcitizen-collector/blob/main/PRIVACY.md

## Security policy

https://github.com/Manuquake/odk-starcitizen-collector/blob/main/SECURITY.md
