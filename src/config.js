import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const DEFAULT_HEARTBEAT_SECONDS = 15;
const DEFAULT_BATCH_INTERVAL_MS = 2500;
const DEFAULT_MAX_BATCH_SIZE = 25;
const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_SCREENSHOT_POLL_INTERVAL_MS = 5000;
const DEFAULT_SCREENSHOT_MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const DEFAULT_COLLECTOR_VERSION = '0.2.0';
const DEFAULT_PARSER_VERSION = 'mvp-0.3.0';
const DEFAULT_INSTALL_CHANNEL = 'LIVE';
export function resolveDefaultConfigPath() {
    const appDataDirectory = process.env.APPDATA?.trim()
        || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appDataDirectory, 'odk-control-center', 'starcitizen-collector.json');
}
export function ensureConfigDirectory(configPath) {
    mkdirSync(path.dirname(configPath), { recursive: true });
}
export function writeCollectorConfig(configPath, config) {
    ensureConfigDirectory(configPath);
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
export function loadCollectorConfig(configPath) {
    if (!existsSync(configPath)) {
        throw new Error(`Config collector non trovata: ${configPath}`);
    }
    const parsed = JSON.parse(stripUtf8Bom(readFileSync(configPath, 'utf8')));
    return validateCollectorConfig(parsed);
}
export function validateCollectorConfig(value) {
    const serverUrl = normalizeServerUrl(normalizeRequiredText(value.serverUrl, 'serverUrl'));
    const clientId = normalizeRequiredText(value.clientId, 'clientId');
    const collectorToken = normalizeRequiredText(value.collectorToken, 'collectorToken');
    const label = normalizeRequiredText(value.label, 'label');
    const discoveredLogPath = normalizeNullableText(value.logPath) ?? discoverDefaultLogPath();
    const screenshotDirectory = normalizeNullableText(value.screenshotDirectory) ?? discoverDefaultScreenshotDirectory(discoveredLogPath);
    return {
        serverUrl,
        clientId,
        collectorToken,
        label,
        logPath: discoveredLogPath,
        heartbeatIntervalSeconds: clampInteger(value.heartbeatIntervalSeconds, DEFAULT_HEARTBEAT_SECONDS, 5, 120),
        batchIntervalMs: clampInteger(value.batchIntervalMs, DEFAULT_BATCH_INTERVAL_MS, 500, 30000),
        maxBatchSize: clampInteger(value.maxBatchSize, DEFAULT_MAX_BATCH_SIZE, 1, 200),
        pollIntervalMs: clampInteger(value.pollIntervalMs, DEFAULT_POLL_INTERVAL_MS, 250, 10000),
        screenshotProofsEnabled: typeof value.screenshotProofsEnabled === 'boolean' ? value.screenshotProofsEnabled : true,
        screenshotDirectory,
        screenshotPollIntervalMs: clampInteger(value.screenshotPollIntervalMs, DEFAULT_SCREENSHOT_POLL_INTERVAL_MS, 1000, 60000),
        screenshotUploadExistingToday: typeof value.screenshotUploadExistingToday === 'boolean' ? value.screenshotUploadExistingToday : true,
        screenshotMaxFileSizeBytes: clampInteger(value.screenshotMaxFileSizeBytes, DEFAULT_SCREENSHOT_MAX_FILE_SIZE_BYTES, 256 * 1024, 15 * 1024 * 1024),
        parserVersion: normalizeNullableText(value.parserVersion) ?? DEFAULT_PARSER_VERSION,
        collectorVersion: normalizeNullableText(value.collectorVersion) ?? DEFAULT_COLLECTOR_VERSION,
        gameInstallChannel: normalizeNullableText(value.gameInstallChannel) ?? DEFAULT_INSTALL_CHANNEL,
        startAtEnd: typeof value.startAtEnd === 'boolean' ? value.startAtEnd : true,
    };
}
export function discoverDefaultLogPath() {
    const candidates = listDefaultLogPathCandidates();
    const existing = candidates.find((candidate) => existsSync(candidate));
    return existing ?? candidates[0];
}
export function resolveExistingLogPath(preferredPath) {
    const candidates = [
        normalizeNullableText(preferredPath),
        ...listDefaultLogPathCandidates(),
    ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
    return candidates.find((candidate) => existsSync(candidate)) ?? null;
}
export function discoverDefaultScreenshotDirectory(logPath) {
    const candidates = listDefaultScreenshotDirectoryCandidates(logPath);
    const existing = candidates.find((candidate) => existsSync(candidate));
    return existing ?? candidates[0] ?? null;
}
export function resolveExistingScreenshotDirectory(preferredDirectory, logPath) {
    const candidates = [
        normalizeNullableText(preferredDirectory),
        ...listDefaultScreenshotDirectoryCandidates(logPath),
    ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
    return candidates.find((candidate) => existsSync(candidate)) ?? null;
}
export function listDefaultLogPathCandidates() {
    const roots = [
        process.env['ProgramFiles'],
        process.env['ProgramFiles(x86)'],
    ]
        .map((value) => normalizeNullableText(value))
        .filter((value) => Boolean(value));
    const channels = ['LIVE', 'PTU'];
    const candidates = [];
    for (const root of roots) {
        for (const channel of channels) {
            candidates.push(path.join(root, 'Roberts Space Industries', 'StarCitizen', channel, 'Game.log'));
        }
    }
    for (const channel of channels) {
        candidates.push(path.join('C:\\RSI', 'StarCitizen', channel, 'Game.log'));
    }
    if (candidates.length === 0) {
        candidates.push('C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log');
    }
    return Array.from(new Set(candidates));
}
export function listDefaultScreenshotDirectoryCandidates(logPath) {
    const candidates = [];
    const normalizedLogPath = normalizeNullableText(logPath);
    if (normalizedLogPath) {
        candidates.push(path.join(path.dirname(normalizedLogPath), 'ScreenShots'));
    }
    for (const logCandidate of listDefaultLogPathCandidates()) {
        candidates.push(path.join(path.dirname(logCandidate), 'ScreenShots'));
    }
    const localAppDataDirectory = process.env.LOCALAPPDATA?.trim()
        || path.join(os.homedir(), 'AppData', 'Local');
    candidates.push(path.join(localAppDataDirectory, 'Star Citizen', 'Crashes'));
    return Array.from(new Set(candidates));
}
function clampInteger(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}
function normalizeRequiredText(value, fieldName) {
    const normalized = normalizeNullableText(value);
    if (!normalized) {
        throw new Error(`${fieldName} e obbligatorio`);
    }
    return normalized;
}
function normalizeNullableText(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
}
function stripUtf8Bom(value) {
    return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
function normalizeServerUrl(value) {
    const collectorSuffix = '/api/starcitizen/collector';
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw new Error('serverUrl non e un URL valido');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('serverUrl deve usare http o https');
    }
    if (parsed.search || parsed.hash) {
        throw new Error('serverUrl non deve contenere query o fragment. Usa il root del sito ODK oppure /api/starcitizen/collector.');
    }
    const pathname = parsed.pathname.replace(/\/+$/, '');
    if (!pathname || pathname === '/') {
        return parsed.origin;
    }
    if (pathname.toLowerCase() === collectorSuffix) {
        return parsed.origin;
    }
    throw new Error('serverUrl deve essere il root del sito ODK oppure la base /api/starcitizen/collector, non una pagina interna o un link OAuth.');
}
