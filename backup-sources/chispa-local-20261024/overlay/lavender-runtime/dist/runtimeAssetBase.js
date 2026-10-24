let explicitBase = null;
export function setLavenderAssetBase(baseUrl) {
    explicitBase = baseUrl && baseUrl.trim() ? baseUrl : null;
}
function defaultDocumentBase() {
    if (typeof document !== 'undefined' && document.baseURI)
        return document.baseURI;
    return 'http://localhost/';
}
export function resolveLavenderAsset(assetPath, baseUrl) {
    const base = baseUrl || explicitBase || defaultDocumentBase();
    const normalized = assetPath.replace(/^\/+/, '');
    return new URL(normalized, base).href;
}
