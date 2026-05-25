export function parseCollectorApiResponse(response, rawBody) {
    const payloadJson = rawBody.trim().length > 0 ? tryParseJson(rawBody) : null;
    if (!response.ok) {
        const message = payloadJson && typeof payloadJson === 'object' && 'error' in payloadJson && typeof payloadJson.error === 'string'
            ? payloadJson.error
            : rawBody.trim() || `HTTP ${response.status}`;
        throw new Error(message);
    }
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('application/json')) {
        throw new Error(`Endpoint collector non valido: ${response.url} ha risposto ${contentType || 'senza content-type'} invece di application/json. Usa l'URL del sito ODK, non una pagina Discord/OAuth.`);
    }
    if (!payloadJson || typeof payloadJson !== 'object' || !('data' in payloadJson)) {
        throw new Error(`Endpoint collector non valido: ${response.url} non ha restituito il JSON atteso dell'API collector.`);
    }
    const data = payloadJson.data;
    if (!data || typeof data !== 'object') {
        throw new Error(`Endpoint collector non valido: ${response.url} ha restituito un campo data vuoto o non valido.`);
    }
    return data;
}
function tryParseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
