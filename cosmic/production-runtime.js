import { ConstellationFracture } from './constellation-fracture.js?prepdiag=20260928g';
import { CosmicAudioDirector } from './cosmic-audio.js?prepdiag=20260928g';
import { CosmicEventController, createDomCosmicSceneView } from './cosmic-event.js?prepdiag=20260928i';
import { CosmicRenderer } from './cosmic-renderer.js?prepdiag=20260928g';
import { ChispaLavenderHost } from './lavender-host.js?prepdiag=20260928g';
import { PageMusicDirector } from './page-music.js?prepdiag=20260928g';
import { detectBrowserQualityEnvironment, selectQualityProfile } from './quality-profile.js?prepdiag=20260928g';
import { productionWebglAdapter } from './webgl-adapter.js?prepdiag=20260928g';
import { createCosmicSfxManifest } from './sfx-manifest.js?prepdiag=20260928h';

export async function loadCanonicalLavenderEngine(siteRoot) {
  const assetBaseModuleUrl = new URL('../lavender-runtime/dist/runtimeAssetBase.js', import.meta.url).href;
  const engineModuleUrl = new URL('../lavender-runtime/dist/renderer/LavenderSvgEngine.js?prepdiag=20260928g', import.meta.url).href;
  console.info('[BOOT] Lavender runtime import start', JSON.stringify({ assetBaseModuleUrl, engineModuleUrl }));
  let requestedModuleUrl = assetBaseModuleUrl;
  let assets;
  let runtime;
  try {
    assets = await import('../lavender-runtime/dist/runtimeAssetBase.js');
    assets.setLavenderAssetBase(siteRoot);
    requestedModuleUrl = engineModuleUrl;
    runtime = await import('../lavender-runtime/dist/renderer/LavenderSvgEngine.js?prepdiag=20260928g');
  } catch (cause) {
    const error = new Error(`Lavender runtime import failed: ${cause?.message ?? cause}`);
    error.name = cause?.name || error.name;
    error.stage = 'lavender-runtime-import';
    error.url = cause?.url || requestedModuleUrl;
    error.cause = cause;
    console.error('[PREP_FAILED]', JSON.stringify({
      stage: error.stage, url: error.url, name: error.name,
      message: cause?.message ?? error.message, stack: cause?.stack ?? error.stack,
    }));
    throw error;
  }
  console.info('[BOOT] Lavender runtime import ok', JSON.stringify({ engineModuleUrl }));
  return runtime.LavenderSvgEngine;
}

async function prepareCriticalPageAssets(doc, win, siteRoot) {
  const imageNode = doc?.querySelector?.('#lyre-bg');
  const imageSource = imageNode?.getAttribute?.('href')
    ?? imageNode?.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href');
  const ImageCtor = win?.Image ?? doc?.defaultView?.Image;
  const imageReady = imageSource && ImageCtor
    ? (async () => {
      const image = new ImageCtor();
      image.decoding = 'async';
      const url = new URL(imageSource, siteRoot).href;
      const startedAt = globalThis.performance?.now?.() ?? Date.now();
      console.info('[ASSET] background start', JSON.stringify({ asset: 'lyre-bg', url }));
      image.src = url;
      try {
        if (typeof image.decode === 'function') await image.decode();
        else await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
        console.info('[ASSET] background decoded', JSON.stringify({
          asset: 'lyre-bg', url,
          width: image.naturalWidth, height: image.naturalHeight,
          elapsedMs: Math.round((globalThis.performance?.now?.() ?? Date.now()) - startedAt),
        }));
        return true;
      } catch (cause) {
        console.error('[ASSET] background decode failed', JSON.stringify({
          stage: 'image-decode', asset: 'lyre-bg', url,
          name: cause?.name, message: cause?.message, stack: cause?.stack,
        }));
        return false;
      }
    })()
    : (console.info('[ASSET] background decode skipped', { asset: 'lyre-bg', reason: !imageSource ? 'missing-source' : 'Image-unavailable' }), Promise.resolve(false));
  console.info('[VISUAL] fonts start');
  const fontsReady = doc?.fonts?.ready
    ? Promise.resolve(doc.fonts.ready).then(() => {
      console.info('[VISUAL] fonts ok');
      return true;
    }, (cause) => {
      const error = new Error(`Font readiness failed: ${cause?.message ?? cause}`);
      error.stage = 'font-readiness';
      error.cause = cause;
      console.error('[PREP_FAILED]', JSON.stringify({ stage: error.stage, name: cause?.name, message: cause?.message, stack: cause?.stack }));
      throw error;
    })
    : (console.info('[VISUAL] fonts ok', { reason: 'document.fonts unavailable' }), Promise.resolve(true));
  const [image, fonts] = await Promise.all([imageReady, fontsReady]);
  return { image, fonts };
}

const DEFAULT_DEPENDENCIES = Object.freeze({
  ConstellationFracture,
  CosmicRenderer,
  CosmicAudioDirector,
  ChispaLavenderHost,
  CosmicEventController,
  PageMusicDirector,
  productionWebglAdapter,
  loadCanonicalEngine: loadCanonicalLavenderEngine,
  createView: createDomCosmicSceneView,
});

export async function createProductionCosmicController({
  doc = globalThis.document,
  win = globalThis.window,
  storage = globalThis.localStorage,
  layer,
  siteRoot = new URL('../', import.meta.url).href,
  dependencies = {},
} = {}) {
  const deps = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const svg = doc?.querySelector?.('#constellation');
  const group = doc?.querySelector?.('#lyra-group');
  const sky = doc?.querySelector?.('#sky');
  if (!svg || !group || !sky) throw new Error('Cosmic finale requires the live Chispa constellation and sky');
  if (!layer?.querySelector) throw new Error('Cosmic finale requires its isolated presentation layer');

  const vfxHost = layer.querySelector('.cosmic-vfx-host');
  const lavenderStage = layer.querySelector('.cosmic-lavender-stage');
  if (!vfxHost || !lavenderStage) throw new Error('Cosmic presentation layer is incomplete');

  const quality = selectQualityProfile(detectBrowserQualityEnvironment(win));
  let Engine;
  try {
    Engine = await deps.loadCanonicalEngine(siteRoot);
  } catch (cause) {
    const error = new Error(`Canonical Lavender engine could not load: ${cause?.message ?? cause}`);
    error.stage = cause?.stage ?? 'lavender-runtime-import';
    error.cause = cause;
    if (cause?.url) error.url = cause.url;
    throw error;
  }
  const fracture = new deps.ConstellationFracture({
    svg, group,
    motionScale: quality.reducedMotion ? 0.68 : (quality.name === 'LITE' ? 0.82 : 1),
  });
  const renderer = new deps.CosmicRenderer({
    container: vfxHost,
    quality,
    webglAdapter: deps.productionWebglAdapter,
  });
  const ambientElements = ['#bg-music', '#altair-music', '#altair-music-2', '#deneb-player']
    .map((selector) => doc?.querySelector?.(selector))
    .filter(Boolean);
  const audio = new deps.CosmicAudioDirector({
    soundEffects: createCosmicSfxManifest(siteRoot),
    gain: 0.34,
    outputGain: 0.82,
  });
  const music = new deps.PageMusicDirector({
    url: new URL('assets/music/dandara-legacy.mp3', siteRoot).href,
    audioContext: audio.ensureContext(),
    output: audio.getMixOutput(),
    doc,
    legacyElements: ambientElements,
    gain: 0.68,
  });
  const lavender = new deps.ChispaLavenderHost({
    container: lavenderStage,
    Engine,
    reducedMotion: quality.reducedMotion,
  });
  const view = deps.createView({ layer, world: sky, vfxHost, quality });

  return new deps.CosmicEventController({
    fracture,
    renderer,
    audio,
    music,
    lavender,
    view,
    criticalAssetPreparer: () => prepareCriticalPageAssets(doc, win, siteRoot),
    storage,
  });
}




