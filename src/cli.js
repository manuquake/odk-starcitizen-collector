import { existsSync } from 'node:fs';
import { mkdir, open, readFile, readdir, stat as statPath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { discoverDefaultLogPath, discoverDefaultScreenshotDirectory, ensureConfigDirectory, loadCollectorConfig, resolveDefaultConfigPath, resolveExistingLogPath, resolveExistingScreenshotDirectory, validateCollectorConfig, writeCollectorConfig, } from './config.js';
import { parseCollectorApiResponse } from './http.js';
import { createSyntheticCollectorEvent, discoverBuild, discoverObservedAtFromLine, parseGameLogLine } from './parser.js';
import { buildCollectorRequestUrl } from './url.js';
const DEFAULT_HELP = `ODK Star Citizen Collector

Comandi:
  init    Crea o aggiorna il file di configurazione locale
  run     Avvia il collector e taila Game.log

Opzioni comuni:
  --config <path>       Percorso file config JSON

Opzioni init:
  --server-url <url>
  --client-id <id>
  --collector-token <token>
  --label <label>
  --log-path <path>
  --screenshot-directory <path>

Esempi:
  npm run collector:init -- --server-url https://app.odkclan.it --client-id <id> --collector-token <token>
  npm run collector:run
`;
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command || command === '--help' || command === '-h') {
        console.log(DEFAULT_HELP);
        return;
    }
    if (command === 'init') {
        await runInitCommand(args.slice(1));
        return;
    }
    if (command === 'run') {
        await runCollectorCommand(args.slice(1));
        return;
    }
    throw new Error(`Comando non riconosciuto: ${command}`);
}
async function runInitCommand(args) {
    const configPath = readOption(args, '--config') ?? resolveDefaultConfigPath();
    const rl = createInterface({ input, output });
    try {
        const defaultClientId = readOption(args, '--client-id') ?? `collector_${randomCompactId()}`;
        const defaultLogPath = readOption(args, '--log-path') ?? discoverDefaultLogPath();
        const serverUrl = await promptValue(rl, 'Server URL', readOption(args, '--server-url'));
        const collectorToken = await promptValue(rl, 'Collector token', readOption(args, '--collector-token'));
        const clientId = await promptValue(rl, 'Client ID', defaultClientId);
        const label = await promptValue(rl, 'Label macchina', readOption(args, '--label') ?? `${os.hostname()} Star Citizen`);
        const logPath = await promptValue(rl, 'Game.log path', defaultLogPath);
        const screenshotDirectory = readOption(args, '--screenshot-directory') ?? discoverDefaultScreenshotDirectory(logPath);
        const config = validateCollectorConfig({
            serverUrl,
            collectorToken,
            clientId,
            label,
            logPath,
            screenshotDirectory,
        });
        ensureConfigDirectory(configPath);
        writeCollectorConfig(configPath, config);
        console.log(`Config salvata in: ${configPath}`);
        console.log(`Game.log: ${config.logPath}`);
        console.log(`ScreenShots: ${config.screenshotDirectory ?? 'non configurata'}`);
        console.log('Avvio consigliato: npm run collector:run');
    }
    finally {
        rl.close();
    }
}
async function runCollectorCommand(args) {
    const configPath = readOption(args, '--config') ?? resolveDefaultConfigPath();
    const config = loadCollectorConfig(configPath);
    const runtime = new StarCitizenCollectorRuntime(config);
    await runtime.start();
}
class StarCitizenCollectorRuntime {
    config;
    api;
    batch = [];
    configDirectory;
    currentOffset = 0;
    initializedFile = false;
    partialLine = '';
    currentSessionId = null;
    lastKnownBuild = null;
    latestObservedAt = null;
    messageSequence = 1;
    flushTimer = null;
    heartbeatTimer = null;
    pollTimer = null;
    screenshotTimer = null;
    shuttingDown = false;
    lastMissingLogNoticeAt = 0;
    lastPollFailureNoticeAt = 0;
    lastMissingScreenshotNoticeAt = 0;
    lastScreenshotFailureNoticeAt = 0;
    initializedScreenshotDirectory = false;
    knownScreenshotFiles = new Map();
    activeLogPath;
    activeScreenshotDirectory;
    constructor(config) {
        this.config = config;
        this.api = new CollectorApiClient(config);
        this.configDirectory = path.dirname(resolveDefaultConfigPath());
        this.activeLogPath = config.logPath;
        this.activeScreenshotDirectory = config.screenshotDirectory;
    }
    async start() {
        await mkdir(this.configDirectory, { recursive: true });
        this.bindSignals();
        logLine(`Collector pronto per ${this.config.label}`);
        logLine(`Server: ${this.config.serverUrl}`);
        logLine(`Game.log: ${this.activeLogPath}`);
        if (this.config.screenshotProofsEnabled) {
            logLine(`ScreenShots: ${this.activeScreenshotDirectory ?? 'non configurata'}`);
        }
        await this.api.postHello({
            sequence: this.nextSequence(),
            sentAt: new Date().toISOString(),
            collectorVersion: this.config.collectorVersion,
            parserVersion: this.config.parserVersion,
            platform: process.platform,
            label: this.config.label,
            gameInstallChannel: this.config.gameInstallChannel,
            lastKnownBuild: this.lastKnownBuild,
            logPath: this.activeLogPath,
        });
        this.flushTimer = setInterval(() => {
            void this.flushBatch();
        }, this.config.batchIntervalMs);
        this.heartbeatTimer = setInterval(() => {
            void this.sendHeartbeat();
        }, this.config.heartbeatIntervalSeconds * 1000);
        this.pollTimer = setInterval(() => {
            void this.runPollCycle();
        }, this.config.pollIntervalMs);
        if (this.config.screenshotProofsEnabled) {
            this.screenshotTimer = setInterval(() => {
                void this.runScreenshotPollCycle();
            }, this.config.screenshotPollIntervalMs);
        }
        await this.runPollCycle();
        await this.runScreenshotPollCycle();
        logLine('Collector in esecuzione. Premi Ctrl+C per terminare.');
        await new Promise(() => {
            // Processo tenuto vivo dai timer.
        });
    }
    bindSignals() {
        const handleExitSignal = (signal) => {
            void this.shutdown(`signal:${signal}`);
        };
        process.on('SIGINT', () => handleExitSignal('SIGINT'));
        process.on('SIGTERM', () => handleExitSignal('SIGTERM'));
    }
    async runPollCycle() {
        try {
            await this.pollLogFile();
        }
        catch (error) {
            const now = Date.now();
            if (now - this.lastPollFailureNoticeAt > 15000) {
                logLine(`Lettura Game.log fallita: ${formatErrorMessage(error)}`);
                this.lastPollFailureNoticeAt = now;
            }
        }
    }
    async runScreenshotPollCycle() {
        if (!this.config.screenshotProofsEnabled) {
            return;
        }
        try {
            await this.pollScreenshotDirectory();
        }
        catch (error) {
            const now = Date.now();
            if (now - this.lastScreenshotFailureNoticeAt > 15000) {
                logLine(`Lettura ScreenShots fallita: ${formatErrorMessage(error)}`);
                this.lastScreenshotFailureNoticeAt = now;
            }
        }
    }
    async pollLogFile() {
        if (this.shuttingDown) {
            return;
        }
        const resolvedLogPath = this.resolveLogPath();
        if (!resolvedLogPath || !existsSync(resolvedLogPath)) {
            const now = Date.now();
            if (now - this.lastMissingLogNoticeAt > 15000) {
                logLine(`Game.log non trovato: ${this.activeLogPath}`);
                this.lastMissingLogNoticeAt = now;
            }
            return;
        }
        const fileHandle = await open(resolvedLogPath, 'r');
        try {
            const stat = await fileHandle.stat();
            if (!this.initializedFile) {
                this.currentOffset = this.config.startAtEnd ? stat.size : 0;
                this.initializedFile = true;
                if (!this.config.startAtEnd && stat.size > 0) {
                    await this.readChunk(fileHandle, stat.size);
                }
                return;
            }
            if (stat.size < this.currentOffset) {
                this.currentOffset = 0;
                this.partialLine = '';
                this.currentSessionId = null;
                logLine('Rotazione/reset di Game.log rilevato, apro una nuova sessione.');
                await this.ensureSessionStarted(new Date().toISOString(), 'Log ruotato o ricreato dal client.');
            }
            if (stat.size > this.currentOffset) {
                await this.readChunk(fileHandle, stat.size);
            }
        }
        finally {
            try {
                await fileHandle.close();
            }
            catch (error) {
                const now = Date.now();
                if (now - this.lastPollFailureNoticeAt > 15000) {
                    logLine(`Chiusura Game.log fallita: ${formatErrorMessage(error)}`);
                    this.lastPollFailureNoticeAt = now;
                }
            }
        }
    }
    async pollScreenshotDirectory() {
        if (this.shuttingDown) {
            return;
        }
        const screenshotDirectory = this.resolveScreenshotDirectory();
        if (!screenshotDirectory || !existsSync(screenshotDirectory)) {
            const now = Date.now();
            if (now - this.lastMissingScreenshotNoticeAt > 30000) {
                logLine(`Cartella ScreenShots non trovata: ${this.activeScreenshotDirectory ?? 'non configurata'}`);
                this.lastMissingScreenshotNoticeAt = now;
            }
            return;
        }
        const entries = await readdir(screenshotDirectory, { withFileTypes: true });
        const imageEntries = entries
            .filter((entry) => entry.isFile() && isScreenshotFileName(entry.name))
            .map((entry) => path.join(screenshotDirectory, entry.name));
        for (const filePath of imageEntries) {
            const fileStat = await statPath(filePath);
            if (!fileStat.isFile()) {
                continue;
            }
            const signature = `${fileStat.size}:${Math.round(fileStat.mtimeMs)}`;
            const previousSignature = this.knownScreenshotFiles.get(filePath);
            if (!this.initializedScreenshotDirectory) {
                this.knownScreenshotFiles.set(filePath, signature);
                if (this.config.screenshotUploadExistingToday
                    && isScreenshotFromCurrentLocalDay(filePath, fileStat)
                    && Date.now() - fileStat.mtimeMs >= 1000) {
                    await this.enqueueScreenshotEvent(filePath, screenshotDirectory, fileStat);
                }
                continue;
            }
            if (previousSignature === signature) {
                continue;
            }
            // Star Citizen can keep the image open for a moment while writing it.
            if (Date.now() - fileStat.mtimeMs < 1000) {
                continue;
            }
            this.knownScreenshotFiles.set(filePath, signature);
            await this.enqueueScreenshotEvent(filePath, screenshotDirectory, fileStat);
        }
        this.initializedScreenshotDirectory = true;
    }
    async readChunk(fileHandle, fileSize) {
        const length = fileSize - this.currentOffset;
        if (length <= 0) {
            return;
        }
        const buffer = Buffer.alloc(length);
        await fileHandle.read(buffer, 0, length, this.currentOffset);
        const chunk = buffer.toString('utf8');
        const chunkStartOffset = this.currentOffset;
        this.currentOffset = fileSize;
        const combined = `${this.partialLine}${chunk}`;
        const lines = combined.split(/\r?\n/);
        this.partialLine = lines.pop() ?? '';
        let runningOffset = chunkStartOffset;
        for (const line of lines) {
            const observedAt = discoverObservedAtFromLine(line, new Date().toISOString());
            const consumedBytes = Buffer.byteLength(`${line}\n`, 'utf8');
            runningOffset += consumedBytes;
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                continue;
            }
            const discoveredBuild = discoverBuild(trimmedLine);
            if (discoveredBuild) {
                this.lastKnownBuild = discoveredBuild;
            }
            if (this.currentSessionId === null) {
                await this.ensureSessionStarted(observedAt, 'Nuove righe rilevate in Game.log.');
            }
            const parsed = parseGameLogLine({
                clientId: this.config.clientId,
                sessionId: this.currentSessionId,
                parserVersion: this.config.parserVersion,
                line: trimmedLine,
                observedAt,
                sourceOffset: Math.max(0, runningOffset - consumedBytes),
                lastKnownBuild: this.lastKnownBuild,
            });
            if (!parsed) {
                continue;
            }
            this.lastKnownBuild = parsed.build ?? this.lastKnownBuild;
            this.latestObservedAt = parsed.observedAt;
            if (parsed.eventType === 'session_ended') {
                this.currentSessionId = null;
            }
            this.enqueueEvent(parsed);
        }
    }
    async enqueueScreenshotEvent(filePath, screenshotDirectory, fileStat) {
        if (Number(fileStat.size) > this.config.screenshotMaxFileSizeBytes) {
            logLine(`Screenshot ignorato per dimensione oltre limite: ${path.basename(filePath)} (${fileStat.size} bytes).`);
            return;
        }
        const observedAt = discoverScreenshotObservedAt(filePath, fileStat);
        const fileName = path.basename(filePath);
        const relativePath = path.relative(screenshotDirectory, filePath) || fileName;
        const fileSha256 = await hashFileSha256(filePath);
        if (this.currentSessionId === null) {
            await this.ensureSessionStarted(observedAt, 'Screenshot rilevato nella cartella ScreenShots.');
        }
        this.latestObservedAt = observedAt;
        const event = createSyntheticCollectorEvent({
            clientId: this.config.clientId,
            sessionId: this.currentSessionId,
            parserVersion: this.config.parserVersion,
            eventType: 'screenshot_captured',
            observedAt,
            sourceFile: trimSourceFile(`ScreenShots/${fileName}`),
            eventIdSalt: fileSha256.slice(0, 16),
            rawLine: `[screenshot] ${fileName}`,
            build: this.lastKnownBuild,
            attributes: {
                proofKind: 'screenshot',
                fileName,
                relativePath,
                fileSize: Number(fileStat.size),
                fileSha256,
                lastModifiedAt: observedAt,
            },
            confidence: 0.86,
        });
        // Flush events already parsed near the screenshot before uploading, so the server can auto-link the proof.
        await this.flushBatch();
        try {
            const proof = await this.api.postProof(filePath, {
                eventId: event.eventId,
                sessionId: event.sessionId,
                observedAt,
                fileName,
                relativePath,
                fileSha256,
            });
            event.attributes = {
                ...(event.attributes ?? {}),
                proofId: normalizeApiText(proof.proofId),
                proofUrl: normalizeApiText(proof.url),
                proofUploadedAt: normalizeApiText(proof.uploadedAt),
                proofLinkedEventCount: normalizeApiNumber(proof.linkedEventCount),
                uploadStatus: 'uploaded',
            };
            logLine(`Screenshot caricato come prova: ${fileName}`);
        }
        catch (error) {
            event.attributes = {
                ...(event.attributes ?? {}),
                uploadStatus: 'failed',
                uploadError: formatErrorMessage(error).slice(0, 240),
            };
            logLine(`Upload screenshot fallito (${fileName}): ${formatErrorMessage(error)}`);
        }
        this.enqueueEvent(event);
    }
    async ensureSessionStarted(observedAt, reason) {
        if (this.currentSessionId !== null) {
            return;
        }
        this.currentSessionId = `session_${this.config.clientId}_${observedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
        this.latestObservedAt = observedAt;
        this.enqueueEvent(createSyntheticCollectorEvent({
            clientId: this.config.clientId,
            sessionId: this.currentSessionId,
            parserVersion: this.config.parserVersion,
            eventType: 'session_started',
            observedAt,
            rawLine: `[collector] ${reason}`,
            build: this.lastKnownBuild,
            attributes: {
                reason,
            },
            confidence: 0.94,
        }));
    }
    enqueueEvent(event) {
        this.batch.push(event);
        if (this.batch.length >= this.config.maxBatchSize) {
            void this.flushBatch();
        }
    }
    async flushBatch() {
        if (this.shuttingDown || this.batch.length === 0) {
            return;
        }
        const events = this.batch.splice(0, this.config.maxBatchSize);
        const payload = {
            sequence: this.nextSequence(),
            sentAt: new Date().toISOString(),
            batchId: `${this.config.clientId}_${Date.now()}`,
            events,
        };
        try {
            const response = await this.api.postEvents(payload);
            logLine(`Batch inviato: ${response.storedEvents ?? events.length} eventi.`);
        }
        catch (error) {
            this.batch.unshift(...events);
            logLine(`Invio batch fallito: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
        }
    }
    async sendHeartbeat() {
        if (this.shuttingDown) {
            return;
        }
        try {
            await this.api.postHeartbeat({
                sequence: this.nextSequence(),
                sentAt: new Date().toISOString(),
                sourceAgeSeconds: calculateSourceAgeSeconds(this.latestObservedAt),
                collectorVersion: this.config.collectorVersion,
                parserVersion: this.config.parserVersion,
                lastKnownBuild: this.lastKnownBuild,
            });
        }
        catch (error) {
            logLine(`Heartbeat fallito: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
        }
    }
    async shutdown(reason) {
        if (this.shuttingDown) {
            return;
        }
        this.shuttingDown = true;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        if (this.screenshotTimer) {
            clearInterval(this.screenshotTimer);
        }
        logLine(`Arresto collector: ${reason}`);
        if (this.currentSessionId) {
            this.enqueueEvent(createSyntheticCollectorEvent({
                clientId: this.config.clientId,
                sessionId: this.currentSessionId,
                parserVersion: this.config.parserVersion,
                eventType: 'session_ended',
                observedAt: new Date().toISOString(),
                rawLine: `[collector] shutdown ${reason}`,
                build: this.lastKnownBuild,
                attributes: {
                    reason,
                },
                confidence: 0.9,
            }));
            this.currentSessionId = null;
        }
        await this.flushBatch();
        try {
            await this.api.postGoodbye({
                sequence: this.nextSequence(),
                sentAt: new Date().toISOString(),
                reason,
            });
        }
        catch (error) {
            logLine(`Goodbye fallito: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
        }
        process.exit(0);
    }
    nextSequence() {
        return this.messageSequence++;
    }
    resolveLogPath() {
        const resolvedLogPath = resolveExistingLogPath(this.activeLogPath);
        if (!resolvedLogPath) {
            return null;
        }
        if (resolvedLogPath !== this.activeLogPath) {
            this.activeLogPath = resolvedLogPath;
            this.initializedFile = false;
            this.currentOffset = 0;
            this.partialLine = '';
            this.currentSessionId = null;
            logLine(`Game.log trovato su fallback: ${resolvedLogPath}`);
        }
        return resolvedLogPath;
    }
    resolveScreenshotDirectory() {
        const resolvedScreenshotDirectory = resolveExistingScreenshotDirectory(this.activeScreenshotDirectory, this.activeLogPath);
        if (!resolvedScreenshotDirectory) {
            return null;
        }
        if (resolvedScreenshotDirectory !== this.activeScreenshotDirectory) {
            this.activeScreenshotDirectory = resolvedScreenshotDirectory;
            this.initializedScreenshotDirectory = false;
            this.knownScreenshotFiles.clear();
            logLine(`Cartella ScreenShots trovata su fallback: ${resolvedScreenshotDirectory}`);
        }
        return resolvedScreenshotDirectory;
    }
}
class CollectorApiClient {
    config;
    constructor(config) {
        this.config = config;
    }
    postHello(payload) {
        return this.post('/api/starcitizen/collector/hello', payload);
    }
    postHeartbeat(payload) {
        return this.post('/api/starcitizen/collector/heartbeat', payload);
    }
    postEvents(payload) {
        return this.post('/api/starcitizen/collector/events', payload);
    }
    async postProof(filePath, input) {
        const body = await readFile(filePath);
        const response = await fetch(buildCollectorRequestUrl(this.config.serverUrl, '/api/starcitizen/collector/proofs'), {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': contentTypeForScreenshot(input.fileName),
                Authorization: `Bearer ${this.config.collectorToken}`,
                'X-Collector-Client-Id': this.config.clientId,
                'X-Proof-Source-Event-Id': input.eventId,
                'X-Proof-Session-Id': input.sessionId ?? '',
                'X-Proof-Observed-At': input.observedAt,
                'X-Proof-File-Name': input.fileName,
                'X-Proof-Relative-Path': input.relativePath,
                'X-Proof-File-Sha256': input.fileSha256,
            },
            body,
        });
        const rawBody = await response.text();
        return parseCollectorApiResponse(response, rawBody);
    }
    postGoodbye(payload) {
        return this.post('/api/starcitizen/collector/goodbye', payload);
    }
    async post(pathname, payload) {
        const response = await fetch(buildCollectorRequestUrl(this.config.serverUrl, pathname), {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config.collectorToken}`,
                'X-Collector-Client-Id': this.config.clientId,
            },
            body: JSON.stringify(payload),
        });
        const rawBody = await response.text();
        return parseCollectorApiResponse(response, rawBody);
    }
}
async function promptValue(rl, label, fallback) {
    if (fallback && fallback.trim().length > 0) {
        return fallback.trim();
    }
    const value = await rl.question(`${label}: `);
    const normalized = value.trim();
    if (!normalized) {
        throw new Error(`${label} e obbligatorio`);
    }
    return normalized;
}
function readOption(args, name) {
    const index = args.findIndex((value) => value === name);
    if (index === -1) {
        return null;
    }
    const next = args[index + 1];
    return typeof next === 'string' && !next.startsWith('--') ? next : null;
}
function randomCompactId() {
    return Math.random().toString(36).slice(2, 10);
}
function calculateSourceAgeSeconds(value) {
    if (!value) {
        return null;
    }
    const observedAt = new Date(value).getTime();
    if (!Number.isFinite(observedAt)) {
        return null;
    }
    return Math.max(0, Math.round((Date.now() - observedAt) / 100) / 10);
}
function isScreenshotFileName(fileName) {
    return /\.(?:jpg|jpeg|png)$/i.test(fileName);
}
function isScreenshotFromCurrentLocalDay(filePath, fileStat) {
    const observedAt = new Date(discoverScreenshotObservedAt(filePath, fileStat));
    const now = new Date();
    return observedAt.getFullYear() === now.getFullYear()
        && observedAt.getMonth() === now.getMonth()
        && observedAt.getDate() === now.getDate();
}
function discoverScreenshotObservedAt(filePath, fileStat) {
    const fileName = path.basename(filePath);
    const timestampPatterns = [
        /ScreenShot-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:-(\d{1,3}))?/i,
        /(?:StarCitizen[_-])?(\d{4})[-_](\d{2})[-_](\d{2})[ _-](\d{2})[-_](\d{2})[-_](\d{2})(?:[-_](\d{1,3}))?/i,
    ];
    for (const pattern of timestampPatterns) {
        const match = fileName.match(pattern);
        if (!match) {
            continue;
        }
        const [, year, month, day, hour, minute, second, millisecond] = match;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number((millisecond ?? '0').padEnd(3, '0').slice(0, 3)));
        if (Number.isFinite(parsed.getTime())) {
            return parsed.toISOString();
        }
    }
    return fileStat.mtime.toISOString();
}
async function hashFileSha256(filePath) {
    const buffer = await readFile(filePath);
    return createHash('sha256').update(buffer).digest('hex');
}
function contentTypeForScreenshot(fileName) {
    return /\.png$/i.test(fileName) ? 'image/png' : 'image/jpeg';
}
function normalizeApiText(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
function normalizeApiNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}
function trimSourceFile(value) {
    return value.length <= 80 ? value : value.slice(value.length - 80);
}
function formatErrorMessage(error) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return String(error);
}
function logLine(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}
void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
