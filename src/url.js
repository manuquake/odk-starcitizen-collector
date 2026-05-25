export function buildCollectorRequestUrl(serverUrl, pathname) {
    const normalizedServerUrl = serverUrl.replace(/\/+$/, '');
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const collectorBasePath = '/api/starcitizen/collector';
    if (normalizedServerUrl.toLowerCase().endsWith(collectorBasePath)) {
        const trimmedPath = normalizedPath.toLowerCase().startsWith(collectorBasePath)
            ? normalizedPath.slice(collectorBasePath.length)
            : normalizedPath;
        return `${normalizedServerUrl}${trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`}`;
    }
    return `${normalizedServerUrl}${normalizedPath}`;
}
