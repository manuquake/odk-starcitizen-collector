const KNOWN_LOCATIONS = [
    'Area18',
    'Lorville',
    'Orison',
    'New Babbage',
    'Port Tressler',
    'Everus Harbor',
    'Grim HEX',
    'Baijini Point',
    'Seraphim Station',
    'MIC-L1',
    'HUR-L1',
    'ARC-L1',
    'CRU-L1',
];
const KNOWN_LOADOUT_SLOTS = [
    'helmet',
    'torso',
    'legs',
    'backpack',
    'mobiglas',
    'weapon',
    'sidearm',
    'medpen',
    'magazine',
    'armor',
];
export function parseGameLogLine(input) {
    const line = input.line.trim();
    if (!line) {
        return null;
    }
    const observedAt = discoverObservedAtFromLine(line, input.observedAt);
    const build = discoverBuild(line) ?? input.lastKnownBuild;
    const locationName = discoverLocation(line);
    const shipName = discoverShipName(line);
    const shipStateName = discoverShipStateName(line);
    const shard = discoverShard(line);
    const playerId = discoverPlayerId(line);
    const missionName = discoverMissionName(line);
    const objectiveName = discoverObjectiveName(line);
    const objectiveKind = discoverObjectiveKind(line);
    const objectiveToken = stripTrailingKeywords(discoverFieldValue(line, ['objectiveToken']), ['created', 'added', 'new']);
    const missionId = discoverMissionId(line);
    const missionState = discoverMissionState(line);
    const objectiveId = discoverObjectiveId(line);
    const objectiveState = discoverObjectiveState(line);
    const objectiveText = discoverObjectiveText(line);
    const objectiveFlags = discoverObjectiveFlags(line);
    const targetName = discoverTargetName(line);
    const routeName = discoverFieldValue(line, ['routeName', 'route']);
    const itemName = discoverItemName(line);
    const slotName = discoverSlotName(line);
    const claimLocation = discoverFieldValue(line, ['claimLocation', 'terminalName', 'serviceLocation']);
    const failureReason = discoverFailureReason(line);
    const contractMissionName = discoverContractAcceptedMissionName(line);
    const haulingDetails = discoverHaulingDetails(line);
    const actorDeath = discoverActorDeath(line);
    const screenshotCapture = discoverScreenshotCapture(line);
    if (isHaulingObjectiveCreatedLine(line) && !isActionableHaulingObjective(haulingDetails, missionId)) {
        return null;
    }
    if (screenshotCapture) {
        return createCollectorEvent(input, {
            eventType: 'screenshot_captured',
            confidence: 0.78,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                proofKind: 'screenshot',
                fileName: screenshotCapture.fileName,
                relativePath: screenshotCapture.relativePath,
                activity: 'evidence',
            }),
        });
    }
    if (actorDeath) {
        return createCollectorEvent(input, {
            eventType: 'combat_actor_death',
            confidence: actorDeath.isNpcVictim ? 0.82 : 0.93,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                victimName: actorDeath.victimName,
                victimId: actorDeath.victimId,
                killerName: actorDeath.killerName,
                killerId: actorDeath.killerId,
                weaponName: actorDeath.weaponName,
                weaponClass: actorDeath.weaponClass,
                damageType: actorDeath.damageType,
                zoneName: actorDeath.zoneName,
                shipName: actorDeath.vehicleName,
                isNpcVictim: actorDeath.isNpcVictim,
                isSelfInflicted: actorDeath.isSelfInflicted,
                isVehicleDestruction: actorDeath.isVehicleDestruction,
                activity: 'combat',
            }),
        });
    }
    if (isContractAcceptedNotificationLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'mission_accepted',
            confidence: 0.95,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName: contractMissionName ?? missionName,
                missionId,
                locationName,
                activity: 'mission',
            }),
        });
    }
    if (isMissionEndedLine(line, missionState)) {
        return createCollectorEvent(input, {
            eventType: mapMissionStateToEventType(missionState),
            confidence: 0.96,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName,
                missionId,
                missionState,
                locationName,
                activity: 'mission',
            }),
        });
    }
    if (isMissionAcceptedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'mission_accepted',
            confidence: 0.82,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName,
                missionId,
                locationName,
                activity: 'mission',
            }),
        });
    }
    if (isStructuredObjectiveUpdateLine(line, objectiveState, objectiveFlags)) {
        return createCollectorEvent(input, {
            eventType: 'mission_objective_updated',
            confidence: objectiveState === 'MISSION_OBJECTIVE_STATE_COMPLETED' || objectiveState === 'MISSION_OBJECTIVE_STATE_FAILED' ? 0.9 : 0.82,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName,
                missionId,
                objectiveName: objectiveText ?? objectiveName,
                objectiveText,
                objectiveId,
                objectiveState,
                objectiveFlags,
                objectiveKind,
                locationName,
                activity: 'mission',
            }),
        });
    }
    if (isMissionObjectiveUpdatedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'mission_objective_updated',
            confidence: 0.84,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName,
                missionId,
                objectiveName: objectiveText ?? objectiveName,
                objectiveText,
                objectiveId,
                objectiveState,
                objectiveKind,
                locationName,
                activity: 'mission',
            }),
        });
    }
    if (isMissionCompletedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'mission_completed',
            confidence: 0.9,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName,
                missionId,
                missionState,
                locationName,
                activity: 'mission',
            }),
        });
    }
    if (isMissionFailedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'mission_failed',
            confidence: 0.9,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName,
                missionId,
                missionState,
                objectiveName,
                objectiveId,
                objectiveState,
                locationName,
                reason: failureReason,
                activity: 'mission',
            }),
        });
    }
    if (isMissionAbandonedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'mission_abandoned',
            confidence: 0.88,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                missionName,
                missionId,
                missionState,
                locationName,
                activity: 'mission',
            }),
        });
    }
    if (isHaulingObjectiveCreatedLine(line) && isActionableHaulingObjective(haulingDetails, missionId)) {
        return createCollectorEvent(input, {
            eventType: 'hauling_objective_created',
            confidence: 0.86,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                objectiveKind: haulingDetails?.objectiveKind ?? objectiveKind,
                missionId: haulingDetails?.missionId ?? missionId,
                sourceName: haulingDetails?.sourceName,
                locationName: haulingDetails?.locationName ?? locationName,
                locationHash: haulingDetails?.locationHash,
                objectiveId: haulingDetails?.objectiveId ?? objectiveId,
                objectiveToken: haulingDetails?.objectiveToken ?? objectiveToken,
                itemGuid: haulingDetails?.itemGuid,
                activity: 'hauling',
            }),
        });
    }
    if (isLoadoutItemAttachedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'loadout_item_attached',
            confidence: 0.8,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                itemName,
                slotName,
                activity: 'loadout',
            }),
        });
    }
    if (isInsuranceClaimRequestedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'insurance_claim_requested',
            confidence: 0.86,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                shipName,
                claimLocation,
            }),
        });
    }
    if (isInsuranceClaimCompletedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'insurance_claim_completed',
            confidence: 0.86,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                shipName,
                claimLocation,
            }),
        });
    }
    if (isPlayerSpawnedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'player_spawned',
            confidence: 0.84,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                locationName,
            }),
        });
    }
    if (isQuantumTargetSelectedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'quantum_target_selected',
            confidence: 0.84,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                targetName,
                shipName,
                activity: 'quantum',
            }),
        });
    }
    if (isQuantumRouteCalculatedLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'quantum_route_calculated',
            confidence: 0.84,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                targetName,
                routeName,
                shipName,
                activity: 'quantum',
            }),
        });
    }
    if (isQuantumErrorLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'quantum_error',
            confidence: 0.88,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                targetName,
                reason: failureReason,
                shipName,
                activity: 'quantum',
            }),
        });
    }
    if (isClientError(line)) {
        return createCollectorEvent(input, {
            eventType: 'client_error',
            confidence: 0.96,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                severity: line.toLowerCase().includes('fatal') ? 'fatal' : 'error',
            }),
        });
    }
    if (hasQuantumContext(line) && !isIgnoredQuantumNoiseLine(line)) {
        const eventType = /\b(complete|completed|end|ended|finish|finished|exit|arrived)\b/i.test(line)
            ? 'quantum_ended'
            : 'quantum_started';
        return createCollectorEvent(input, {
            eventType,
            confidence: 0.72,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                activity: 'quantum',
                targetName,
                shipName,
            }),
        });
    }
    if (shard && isServerJoinLine(line)) {
        return createCollectorEvent(input, {
            eventType: 'server_joined',
            confidence: shard ? 0.9 : 0.68,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                shard,
                region: discoverRegion(line),
            }),
        });
    }
    if (locationName) {
        return createCollectorEvent(input, {
            eventType: 'location_changed',
            confidence: 0.78,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                locationName,
            }),
        });
    }
    if (shipStateName) {
        return createCollectorEvent(input, {
            eventType: 'ship_changed',
            confidence: 0.7,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: compactAttributes({
                shipName: shipStateName,
            }),
        });
    }
    if (/\b(session ended|shutdown complete|game exited|closing game)\b/i.test(line)) {
        return createCollectorEvent(input, {
            eventType: 'session_ended',
            confidence: 0.84,
            rawLine: line,
            build,
            observedAt,
            playerId,
            attributes: null,
        });
    }
    return null;
}
export function createSyntheticCollectorEvent(input) {
    return {
        eventId: buildEventId(input.clientId, input.eventType, input.observedAt, null, input.eventIdSalt ?? input.sourceFile),
        sessionId: input.sessionId,
        playerId: input.playerId ?? null,
        build: input.build,
        sourceFile: input.sourceFile ?? 'Game.log',
        sourceOffset: null,
        eventType: input.eventType,
        observedAt: input.observedAt,
        emittedAt: new Date().toISOString(),
        confidence: input.confidence ?? 0.92,
        parserVersion: input.parserVersion,
        rawLine: input.rawLine,
        attributes: input.attributes,
    };
}
export function discoverBuild(line) {
    const match = line.match(/\b(\d+\.\d+\.\d+(?:[-._][A-Za-z0-9]+)*)\b/);
    const candidate = match?.[1] ?? null;
    if (!candidate || isIpv4Address(candidate)) {
        return null;
    }
    return candidate;
}
export function discoverObservedAtFromLine(line, fallback) {
    const patterns = [
        /\b(\d{4}-\d{2}-\d{2}[T ][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-][0-2]\d:?[0-5]\d)?)\b/,
        /\b(\d{4}\/\d{2}\/\d{2}[T ][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d{1,6})?)\b/,
    ];
    for (const pattern of patterns) {
        const match = line.match(pattern);
        const parsed = normalizeObservedAt(match?.[1]);
        if (parsed) {
            return parsed;
        }
    }
    return fallback ?? new Date().toISOString();
}
function createCollectorEvent(input, event) {
    const observedAt = event.observedAt ?? input.observedAt;
    return {
        eventId: buildEventId(input.clientId, event.eventType, observedAt, input.sourceOffset),
        sessionId: input.sessionId,
        playerId: event.playerId ?? null,
        build: event.build,
        sourceFile: 'Game.log',
        sourceOffset: input.sourceOffset,
        eventType: event.eventType,
        observedAt,
        emittedAt: new Date().toISOString(),
        confidence: event.confidence,
        parserVersion: input.parserVersion,
        rawLine: event.rawLine,
        attributes: event.attributes,
    };
}
function buildEventId(clientId, eventType, observedAt, sourceOffset, salt) {
    const compactObservedAt = observedAt.replace(/[^0-9]/g, '').slice(0, 17);
    const offsetPart = typeof sourceOffset === 'number' ? String(sourceOffset) : normalizeEventIdPart(salt) ?? 'synthetic';
    return `${clientId}_${eventType}_${compactObservedAt}_${offsetPart}`;
}
function normalizeEventIdPart(value) {
    const normalized = normalizeNullableText(value);
    if (!normalized) {
        return null;
    }
    const compact = normalized.replace(/[^A-Za-z0-9_-]+/g, '').slice(0, 28);
    return compact || null;
}
function isMissionAcceptedLine(line) {
    return /\bmission\b/i.test(line) && /\b(accepted|accept)\b/i.test(line);
}
function isContractAcceptedNotificationLine(line) {
    return /\bSHUDEvent_OnNotification\b/i.test(line)
        && /\bAdded notification\b/i.test(line)
        && /"Contract Accepted:/i.test(line);
}
function isMissionEndedLine(line, missionState) {
    return /<MissionEnded>/i.test(line)
        && /\bmission_id\b/i.test(line)
        && Boolean(missionState);
}
function mapMissionStateToEventType(missionState) {
    const normalized = (missionState ?? '').toUpperCase();
    if (normalized.includes('FAILED')) {
        return 'mission_failed';
    }
    if (normalized.includes('ABANDONED') || normalized.includes('CANCELLED') || normalized.includes('CANCELED')) {
        return 'mission_abandoned';
    }
    return 'mission_completed';
}
function isStructuredObjectiveUpdateLine(line, objectiveState, objectiveFlags) {
    if (/<ObjectiveComplete>/i.test(line)) {
        return true;
    }
    if (!/<ObjectiveUpserted>/i.test(line) || !objectiveState) {
        return false;
    }
    const normalizedState = objectiveState.toUpperCase();
    if (!normalizedState.includes('COMPLETED') && !normalizedState.includes('FAILED')) {
        return false;
    }
    const flags = objectiveFlags?.toLowerCase() ?? '';
    return flags.includes('showinlog') || !flags.includes('hidden');
}
function isMissionObjectiveUpdatedLine(line) {
    return /\bmission\b/i.test(line) && /\bobjective\b/i.test(line) && /\b(updated|update|advanced|changed|progress)\b/i.test(line);
}
function isMissionCompletedLine(line) {
    if (/<EndMission>/i.test(line)) {
        return false;
    }
    return /\bmission\b/i.test(line) && /\b(completed|complete|success(?:ful)?)\b/i.test(line);
}
function isMissionFailedLine(line) {
    if (/\b(ShareMission|Failed to share mission|MissionProperty::GeneratePropertyFromString)\b/i.test(line)) {
        return false;
    }
    return /\bmission\b/i.test(line) && /\b(failed|failure)\b/i.test(line);
}
function isMissionAbandonedLine(line) {
    return /\bmission\b/i.test(line) && /\b(abandoned|abandon)\b/i.test(line);
}
function isHaulingObjectiveCreatedLine(line) {
    return /\bCreateHaulingObjectiveHandler\b/i.test(line)
        || (/\bhauling\b/i.test(line) && /\b(objective|objectiveKind)\b/i.test(line) && /\b(created|added|new)\b/i.test(line));
}
function isActionableHaulingObjective(haulingDetails, missionId) {
    const candidateMissionId = normalizeNullableText(haulingDetails?.missionId) ?? missionId;
    if (candidateMissionId && !isPlaceholderMissionId(candidateMissionId)) {
        return true;
    }
    // CreateHaulingObjectiveHandler with all-zero mission ids is generated catalog noise.
    return !candidateMissionId;
}
function isPlaceholderMissionId(value) {
    return /^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(value);
}
function isLoadoutItemAttachedLine(line) {
    return /\b(loadout|equip(?:ment)?|item|attachment|slot)\b/i.test(line) && /\b(attached|equipped|mounted|slotted)\b/i.test(line);
}
function isInsuranceClaimRequestedLine(line) {
    return /\b(claim|insurance)\b/i.test(line) && /\b(requested|request|filed|submitted|started)\b/i.test(line);
}
function isInsuranceClaimCompletedLine(line) {
    return /\b(claim|insurance)\b/i.test(line) && /\b(completed|complete|ready|available|delivered|finished)\b/i.test(line);
}
function isPlayerSpawnedLine(line) {
    if (isIgnoredSpawnNoiseLine(line)) {
        return false;
    }
    return /\b(player|character)\b.*\b(respawned|spawned)\b/i.test(line)
        || /\b(respawned|spawned)\b.*\b(player|character)\b/i.test(line)
        || /\bEntering control state alive\b/i.test(line);
}
function isQuantumTargetSelectedLine(line) {
    return hasQuantumContext(line) && /\btarget\b/i.test(line) && /\b(selected|set)\b/i.test(line);
}
function isQuantumRouteCalculatedLine(line) {
    return hasQuantumContext(line) && /\broute\b/i.test(line) && /\b(calculated|computed|set|ready)\b/i.test(line);
}
function isQuantumErrorLine(line) {
    return hasQuantumContext(line) && /\b(error|failed|failure|invalid|abort(?:ed)?|unreachable|null target|outside zone)\b/i.test(line);
}
function isClientError(line) {
    if (/\b(serializedoverwrite|webrtc\/janus|webrtc|janus)\b/i.test(line)) {
        return false;
    }
    if (/\b(beginsession-003|eos|eac|easy anti-cheat|anti-cheat)\b/i.test(line)) {
        return /\b(fail|failed|fatal|disconnect|disconnected|denied|kicked|violation)\b/i.test(line);
    }
    return /\b(exception|fatal|crash|assert|stacktrace)\b/i.test(line)
        || (/\berror\b/i.test(line) && /\b(client|engine|renderer|network|disconnect|timeout|gpu)\b/i.test(line));
}
function discoverFieldValue(line, keys) {
    for (const key of keys) {
        const escapedKey = escapeRegExp(key);
        const quotedMatch = line.match(new RegExp(`\\b${escapedKey}\\b\\s*[:=-]\\s*(?:\"([^\"]+)\"|'([^']+)')`, 'i'));
        const quotedValue = normalizeNullableText(quotedMatch?.[1] ?? quotedMatch?.[2]);
        if (quotedValue) {
            return quotedValue;
        }
        const match = line.match(new RegExp(`\\b${escapedKey}\\b\\s*[:=-]\\s*(.+?)(?=\\s+\\w+\\s*[:=-]|[,;\\]|]|$)`, 'i'));
        const value = normalizeNullableText(match?.[1]);
        if (value) {
            return value;
        }
    }
    return null;
}
function discoverMissionId(line) {
    const notificationMatch = line.match(/\bMissionId:\s*\[([0-9a-f-]{8,})\]/i);
    const pushMatch = line.match(/\bmission_id\s+([0-9a-f-]{8,})\b/i);
    return normalizeNullableText(notificationMatch?.[1] ?? pushMatch?.[1]);
}
function discoverMissionState(line) {
    const match = line.match(/\bmission_state\s+(MISSION_STATE_[A-Z_]+)\b/i);
    return normalizeNullableText(match?.[1]?.toUpperCase());
}
function discoverObjectiveId(line) {
    const notificationMatch = line.match(/\bObjectiveId:\s*\[([^\]]+)\]/i);
    const pushMatch = line.match(/\bobjective_id\s+([A-Za-z0-9_-]+)\b/i);
    const updateMatch = line.match(/\bObjective updated id=([A-Za-z0-9_-]+)/i);
    return normalizeNullableText(notificationMatch?.[1] ?? pushMatch?.[1] ?? updateMatch?.[1]);
}
function discoverObjectiveState(line) {
    const match = line.match(/\bstate\s+(MISSION_OBJECTIVE_STATE_[A-Z_]+)\b/i);
    return normalizeNullableText(match?.[1]?.toUpperCase());
}
function discoverObjectiveFlags(line) {
    const match = line.match(/\bflags=([A-Za-z0-9_|]+)/i);
    return normalizeNullableText(match?.[1]);
}
function discoverObjectiveText(line) {
    const match = line.match(/\buiDisplay\[Priority=-?\d+\]\[Text=([^\]]*)\]/i);
    const value = normalizeNullableText(match?.[1]);
    if (!value || /^<=\s*UNINITIALIZED\s*=>$/i.test(value)) {
        return null;
    }
    return value;
}
function discoverContractAcceptedMissionName(line) {
    const match = line.match(/"Contract Accepted:\s*(.+?)\s*:\s*"/i);
    const value = normalizeNullableText(match?.[1]);
    return value ? value.replace(/\s+/g, ' ') : null;
}
function discoverHaulingDetails(line) {
    if (!/\bCreateHaulingObjectiveHandler\b/i.test(line)) {
        return null;
    }
    const objectiveKind = normalizeNullableText(line.match(/\b(Pick|Dropoff)\s+created\b/i)?.[1]);
    const locationNameMatch = line.match(/\blocationName:\s*(.+?)\s+\[[^\]]+\]/i);
    return compactAttributes({
        objectiveKind,
        sourceName: discoverFieldValue(line, ['sourcename', 'sourceName']),
        missionId: discoverFieldValue(line, ['missionId']),
        locationName: sanitizeDetectedLocation(locationNameMatch?.[1] ?? discoverFieldValue(line, ['locationName'])),
        locationHash: discoverFieldValue(line, ['locationHash']),
        objectiveId: discoverFieldValue(line, ['objectiveId']),
        objectiveToken: discoverFieldValue(line, ['objectiveTokenDebugName', 'objectiveToken']),
        itemGuid: discoverFieldValue(line, ['itemGuid']),
    });
}
function discoverActorDeath(line) {
    if (!/<Actor Death>/i.test(line)) {
        return null;
    }
    const match = line.match(/CActor::Kill:\s+'([^']+)'\s+\[([^\]]+)\]\s+in zone\s+'([^']+)'\s+killed by\s+'([^']+)'\s+\[([^\]]+)\]\s+using\s+'([^']+)'\s+\[Class ([^\]]+)\]\s+with damage type\s+'([^']+)'/i);
    if (!match) {
        return null;
    }
    const victimName = normalizeNullableText(match[1]);
    const victimId = normalizeNullableText(match[2]);
    const zoneName = normalizeNullableText(match[3]);
    const killerName = normalizeNullableText(match[4]);
    const killerId = normalizeNullableText(match[5]);
    const weaponName = normalizeNullableText(match[6]);
    const weaponClass = normalizeNullableText(match[7]);
    const damageType = normalizeNullableText(match[8]);
    const vehicleName = discoverVehicleNameFromZone(zoneName);
    return {
        victimName,
        victimId,
        zoneName,
        killerName,
        killerId,
        weaponName,
        weaponClass,
        damageType,
        vehicleName,
        isNpcVictim: Boolean(victimName && /(?:^PU_|_NPC_|Human_Enemy|Criminal-Pilot|AI_CRIM)/i.test(victimName)),
        isSelfInflicted: Boolean(victimId && killerId && victimId === killerId),
        isVehicleDestruction: damageType?.toLowerCase() === 'vehicledestruction',
    };
}
function discoverScreenshotCapture(line) {
    const screenshotMatch = line.match(/\bScreenShot:\s*(ScreenShots[\\/][^\s"]+\.(?:jpg|jpeg|png))/i);
    if (screenshotMatch) {
        const relativePath = screenshotMatch[1].replaceAll('\\', '/');
        return {
            relativePath,
            fileName: pathLikeBasename(relativePath),
        };
    }
    const savedMatch = line.match(/\bSaved screenshot to\s+(.+\.(?:jpg|jpeg|png))\b/i);
    if (savedMatch) {
        const filePath = savedMatch[1].trim();
        return {
            relativePath: pathLikeBasename(filePath),
            fileName: pathLikeBasename(filePath),
        };
    }
    return null;
}
function discoverLocation(line) {
    const fieldValue = discoverFieldValue(line, [
        'locationName',
        'location',
        'zone',
        'spawnLocation',
        'spawn',
        'destinationName',
        'pickupLocation',
        'dropoffLocation',
    ]);
    if (fieldValue) {
        return sanitizeDetectedLocation(fieldValue);
    }
    const inventoryLocationMatch = line.match(/\brequested inventory for Location\[([A-Za-z][A-Za-z0-9_ -]+)\]/i);
    const inventoryLocation = sanitizeDetectedLocation(inventoryLocationMatch?.[1]);
    if (inventoryLocation) {
        return inventoryLocation;
    }
    const bracketedLocationMatch = line.match(/\bLocation\[([A-Za-z][A-Za-z0-9_ -]+)\]/i);
    const bracketedLocation = sanitizeDetectedLocation(bracketedLocationMatch?.[1]);
    if (bracketedLocation && !isNoisyLocationLine(line)) {
        return bracketedLocation;
    }
    if (isNoisyLocationLine(line)) {
        return null;
    }
    if (/\b(location|spawn|inventory|destination|pickup|dropoff)\b/i.test(line)) {
        return KNOWN_LOCATIONS.find((location) => new RegExp(`\\b${escapeRegExp(location)}\\b`, 'i').test(line)) ?? null;
    }
    return null;
}
function discoverShipName(line) {
    return discoverExplicitShipName(line) ?? discoverNavigationShipName(line);
}
function discoverShipStateName(line) {
    return discoverExplicitShipName(line);
}
function discoverPlayerId(line) {
    return discoverFieldValue(line, ['playerId', 'player', 'characterName', 'character', 'citizen']);
}
function discoverMissionName(line) {
    return stripTrailingKeywords(discoverFieldValue(line, ['missionTitle', 'missionName', 'contractTitle', 'contractName', 'mission']), ['accepted', 'accept', 'completed', 'complete', 'failed', 'failure', 'abandoned', 'abandon']);
}
function discoverObjectiveName(line) {
    return stripTrailingKeywords(discoverFieldValue(line, ['objectiveTitle', 'objectiveName', 'objective']), ['objective', 'updated', 'update', 'advanced', 'changed', 'progress']);
}
function discoverObjectiveKind(line) {
    return discoverFieldValue(line, ['objectiveKind', 'haulingKind']);
}
function discoverTargetName(line) {
    return discoverFieldValue(line, ['targetName', 'destinationName', 'routeTargetName']);
}
function discoverItemName(line) {
    return discoverFieldValue(line, ['itemName', 'loadoutItemName', 'equipmentName', 'item']);
}
function discoverFailureReason(line) {
    const explicit = discoverFieldValue(line, ['reason', 'errorMessage', 'failureReason', 'error']);
    if (explicit) {
        return explicit;
    }
    if (/\bfailed to get starmap route data\b/i.test(line) || /\bno route loaded\b/i.test(line)) {
        return 'route_data_unavailable';
    }
    return null;
}
function discoverSlotName(line) {
    const explicit = discoverFieldValue(line, ['slotName', 'slot', 'loadoutSlot']);
    if (explicit) {
        return explicit;
    }
    return KNOWN_LOADOUT_SLOTS.find((slot) => line.toLowerCase().includes(slot)) ?? null;
}
function discoverVehicleNameFromZone(zoneName) {
    if (!zoneName || !/^[A-Z0-9]{3,6}_/.test(zoneName)) {
        return null;
    }
    return zoneName
        .replace(/_\d{5,}$/, '')
        .replaceAll('_', ' ');
}
function pathLikeBasename(value) {
    const parts = value.replaceAll('\\', '/').split('/');
    return parts[parts.length - 1] || value;
}
function discoverShard(line) {
    const bracketed = line.match(/\bshard\[([^\]]+)\]/i);
    if (bracketed?.[1]) {
        return bracketed[1];
    }
    const explicit = discoverFieldValue(line, ['shard', 'server', 'serverName']);
    if (explicit) {
        return explicit;
    }
    const match = line.match(/\b([A-Z]{2,3}-\d{1,4}|[a-z]{2,3}-\d{1,4})\b/);
    return match?.[1] ?? null;
}
function discoverRegion(line) {
    if (/\bEU\b/i.test(line)) {
        return 'EU';
    }
    if (/\bUS\b/i.test(line)) {
        return 'US';
    }
    if (/\bAP\b/i.test(line)) {
        return 'AP';
    }
    return null;
}
function compactAttributes(attributes) {
    const normalizedEntries = Object.entries(attributes).filter(([, value]) => value !== null && value !== undefined && value !== '');
    if (normalizedEntries.length === 0) {
        return null;
    }
    return Object.fromEntries(normalizedEntries);
}
function normalizeObservedAt(value) {
    if (!value) {
        return null;
    }
    const normalized = value.trim().replace(' ', 'T');
    const parsed = Date.parse(normalized);
    if (Number.isNaN(parsed)) {
        return null;
    }
    return new Date(parsed).toISOString();
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function stripTrailingKeywords(value, keywords) {
    if (!value) {
        return null;
    }
    const pattern = new RegExp(`\\s+(?:${keywords.map(escapeRegExp).join('|')})\\b.*$`, 'i');
    const normalized = value.replace(pattern, '').trim();
    return normalized || value;
}
function normalizeNullableText(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
}
function discoverExplicitShipName(line) {
    return discoverFieldValue(line, ['shipName', 'ship', 'vehicle', 'vehicleName', 'claimShipName']);
}
function discoverNavigationShipName(line) {
    if (isIgnoredShipNavigationLine(line)) {
        return null;
    }
    const match = line.match(/\|\s*([A-Z]{3,6}_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*)_\d{5,}\[[0-9]+\]/);
    const token = normalizeNullableText(match?.[1]);
    if (!token) {
        return null;
    }
    return token.replaceAll('_', ' ');
}
function sanitizeDetectedLocation(value) {
    const normalized = normalizeNullableText(value);
    if (!normalized) {
        return null;
    }
    if (/^\d+$/.test(normalized) || /^location:\d+$/i.test(normalized)) {
        return null;
    }
    const compact = normalized.toLowerCase();
    if (compact === 'location'
        || compact === 'combat'
        || compact === 'combat prohibited'
        || compact === 'caution'
        || compact === 'caution advised'
        || compact === 'unknown location name'
        || compact.includes('armistice zone')) {
        return null;
    }
    return normalized;
}
function isNoisyLocationLine(line) {
    return /\b(statobjload|updatenotificationitem|shudevent_onnotification)\b/i.test(line)
        || /\b(GenerateLocationProperty|Spawn Flow|ShipInsuranceProvider|OnVehicleStored|OnVehicleSpawned)\b/i.test(line)
        || /objectcontainers\//i.test(line)
        || /\bphysicsgrid\b/i.test(line);
}
function isIgnoredQuantumNoiseLine(line) {
    return /\bLocal Route Guard - Server Rerouted\b/i.test(line);
}
function isIgnoredShipNavigationLine(line) {
    return isIgnoredQuantumNoiseLine(line);
}
function isServerJoinLine(line) {
    if (/\b(OnLobbyMemberJoined|OnSocialMemberJoined|WebRTC|Janus|OnOwnerRemoved)\b/i.test(line)) {
        return false;
    }
    return /\b(joined|join|connecting|connected)\b.*\b(server|shard)\b/i.test(line)
        || /\b(server|shard)\b.*\b(joined|join|connecting|connected)\b/i.test(line)
        || /\bJoined shard\b/i.test(line)
        || /\bJoin PU\b/i.test(line);
}
function isIgnoredSpawnNoiseLine(line) {
    return /\b(ResolveSpawnLocation Location Not Found|Could not resolve initial spawn|override spawn location|lost reservation for spawnpoint|UnregisterFromExternalSystems|VerifySpawnPos|spawn blooper|bad spawn position|fakecommsaudioentity|ShipInsuranceProvider|OnVehicleSpawned)\b/i.test(line);
}
function isIpv4Address(value) {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
}
function hasQuantumContext(line) {
    return /\bquantum\b/i.test(line)
        || /\bQuantumTravel\b/i.test(line)
        || /\bstarmap route\b/i.test(line)
        || /\broute data\b/i.test(line);
}
