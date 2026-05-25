# Changelog

## v0.2.0 - 2026-05-25

Initial public open-source release of ODK Star Citizen Collector.

### Added

- Local Windows-friendly collector for Star Citizen `Game.log`.
- Collector handshake, heartbeat, event batching, and graceful goodbye support.
- URL normalization for both site root and collector API endpoint.
- Parser support for session, server, location, ship, quantum, mission, hauling,
  loadout, insurance claim, player spawn, and client error events.
- Screenshot proof detection and upload support when enabled by configuration.
- Local config loading from `%APPDATA%\odk-control-center\starcitizen-collector.json`.
- Example collector config.
- Privacy, security, contribution, and code-signing documentation.

### Security And Privacy

- The collector does not read Star Citizen process memory.
- The collector does not inject code into Star Citizen.
- The collector does not modify Star Citizen files.
- Collector tokens are not included in the repository or release artifacts.
- Screenshot proof uploads are documented and can be disabled in config.

### Known Limits

- `Game.log` does not reliably expose mission payout, net profit, exact cargo
  sold, or final inventory state.
- Parser rules remain heuristic and may need updates when Star Citizen changes
  log formats.
- Windows installer code signing is planned but not yet active for this public
  source release.
