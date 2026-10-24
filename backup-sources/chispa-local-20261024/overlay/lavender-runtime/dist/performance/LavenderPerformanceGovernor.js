function readSaveData() {
    const connection = navigator.connection;
    return connection?.saveData === true;
}
function readDeviceMemory() {
    return navigator.deviceMemory;
}
export function resolveLavenderPerformance(requested = 'auto') {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const memory = readDeviceMemory();
    const cores = navigator.hardwareConcurrency || 4;
    const constrained = readSaveData() || reduced || coarse || (memory !== undefined && memory <= 4) || cores <= 4;
    const quality = requested === 'auto' ? (constrained ? 'optimized' : 'full') : requested;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    if (quality === 'optimized') {
        return {
            quality,
            resolution: Math.min(dpr, 1.5),
            maxFps: 30,
            blurQuality: 2,
            glowStrength: 11,
            allowSecondarySparkle: false,
            powerPreference: 'low-power',
        };
    }
    return {
        quality,
        resolution: Math.min(2.5, Math.max(1.5, dpr * 1.35)),
        maxFps: 60,
        blurQuality: 4,
        glowStrength: 17,
        allowSecondarySparkle: !reduced,
        powerPreference: requested === 'full' ? 'high-performance' : 'low-power',
    };
}
