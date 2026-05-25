# Player Install

## Recommended Install

Download the signed Windows installer from the ODK release page:

```text
ODK-StarCitizen-Collector-Setup.exe
```

If the installer is not signed yet, Windows may show an unknown publisher
warning. Verify the SHA-256 hash published with the release.

## Setup

1. Log in to the ODK website with Discord.
2. Open `Star Citizen / Entity Live / Setup collector`.
3. Generate a collector token.
4. Run the collector configurator.
5. Select the Star Citizen folder, usually `StarCitizen\LIVE`.
6. Paste the collector token and client ID.
7. Start the collector.
8. Start Star Citizen.

## Stopping The Collector

Press `Ctrl+C` in the collector console window.

## Removing Local Credentials

Delete:

```text
%APPDATA%\odk-control-center\starcitizen-collector.json
```

Then revoke the collector token from the ODK website.
