# Contributing

Contributions are welcome, especially:

- new real `Game.log` samples with sensitive data redacted;
- parser fixes for patch-specific log formats;
- safer filtering of noisy or misleading log lines;
- Windows packaging improvements;
- privacy and documentation improvements.

## Development

Run syntax checks:

```powershell
npm run check
```

Run the collector from source:

```powershell
npm run collector:init
npm run collector:run
```

## Parser Changes

When adding a new event type:

- keep event names stable and lowercase with underscores;
- document the event in `README.md`;
- avoid promoting noisy log lines to high-confidence events;
- include redacted sample log lines when possible.

## Privacy

Do not include real collector tokens, player identifiers, Discord tokens,
private backend URLs, or unredacted screenshots in issues or pull requests.
