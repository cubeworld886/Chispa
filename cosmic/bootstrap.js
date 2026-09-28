export function isDebugReplay(search = globalThis.location?.search ?? '') {
  try {
    return new URLSearchParams(search).get('cosmicReplay') === '1';
  } catch {
    return false;
  }
}

function preparationFailureDetails(detail, fallbackStage = 'unknown') {
  const error = detail?.error ?? detail;
  const chain = [];
  const seen = new Set();
  for (let current = error; current && typeof current === 'object' && !seen.has(current); current = current.cause) {
    seen.add(current);
    chain.push(current);
  }
  const assetFailure = chain.find((item) => item.assetId || item.url || item.status != null);
  const deepest = [...chain].reverse().find((item) => item.message) ?? chain.at(-1);
  return {
    stage: assetFailure?.stage ?? chain.find((item) => item.stage)?.stage ?? detail?.stage ?? fallbackStage,
    asset: assetFailure?.assetId,
    url: assetFailure?.url,
    status: assetFailure?.status,
    contentType: assetFailure?.contentType,
    errorName: deepest?.name ?? error?.name ?? 'Error',
    errorMessage: deepest?.message ?? error?.message ?? String(error ?? 'Unknown failure'),
    stack: deepest?.stack ?? error?.stack,
    failedAssets: chain.flatMap((item) => Array.isArray(item.failures) ? item.failures : [])
      .map((failure) => ({
        stage: failure?.stage,
        asset: failure?.assetId,
        url: failure?.url,
        status: failure?.status,
        contentType: failure?.contentType,
        errorName: failure?.cause?.name ?? failure?.name,
        errorMessage: failure?.cause?.message ?? failure?.message,
      })),
  };
}

function formatPreparationDiagnostic(detail, fallbackStage = 'unknown') {
  const info = preparationFailureDetails(detail, fallbackStage);
  const parts = ['PREP_FAILED', `stage: ${info.stage}`];
  if (info.asset) parts.push(`asset: ${info.asset}`);
  if (info.url) parts.push(`URL: ${info.url}`);
  if (info.status != null) parts.push(`HTTP: ${info.status}`);
  if (info.contentType) parts.push(`type: ${info.contentType}`);
  parts.push(`error: ${info.errorName}: ${info.errorMessage}`);
  return parts.join(' · ');
}

export function installCosmicBootstrap({ createController, onProgress = () => {} } = {}) {
  if (typeof createController !== 'function') throw new Error('Cosmic bootstrap requires createController');

  let controllerPromise = null;
  let resolvedController = null;
  let preloadPromise = null;
  let started = false;
  let disposed = false;
  let state = 'boot';
  let failureReported = false;

  const emit = (next, detail = null) => {
    state = next;
    console.info(`[BOOT] stage ${next}`);
    try { onProgress(next, detail); } catch {}
  };

  const reportFailure = (error) => {
    if (failureReported) return;
    failureReported = true;
    const details = preparationFailureDetails(error, state);
    console.error('[Chispa][PREP_FAILED]', JSON.stringify(details), details.stack || '');
  };

  const ensureController = () => {
    if (!controllerPromise) {
      controllerPromise = Promise.resolve().then(async () => {
        console.info('[BOOT] runtime start');
        const controller = await createController();
        if (!controller) throw new Error('Cosmic runtime did not create a controller');
        resolvedController = controller;
        console.info('[BOOT] runtime ok');
        emit('runtime');
        return controller;
      });
    }
    return controllerPromise;
  };

  const ensurePreloaded = () => {
    if (disposed) return Promise.resolve(null);
    if (!preloadPromise) {
      preloadPromise = ensureController().then(async (controller) => {
        console.info('[BOOT] critical-assets start');
        emit('critical-assets');
        const result = await controller.preload?.({ onProgress: emit });
        if (result === false) throw new Error('Cosmic controller declined readiness');
        if (disposed) return null;
        console.info('[READY] scene prepared');
        emit('ready');
        return controller;
      }).catch((error) => {
        const detail = { stage: state, error };
        emit('error', detail);
        reportFailure(detail);
        throw error;
      });
    }
    return preloadPromise;
  };

  console.info('[BOOT] start');
  emit('boot');
  void ensurePreloaded().catch(() => {});

  return {
    get status() { return state; },
    preload: ensurePreloaded,
    async start() {
      if (started || disposed || state !== 'ready') return false;
      started = true;
      try {
        // Preserve transient user activation in iOS Safari for AudioContext.resume()
        // and HTMLMediaElement.play(); do this before the first await in this handler.
        resolvedController?.primeStartGesture?.();
        const controller = await ensurePreloaded();
        if (!controller || disposed) return false;
        emit('starting');
        controller.arm?.();
        const result = await controller.start?.();
        if (result === false) throw new Error('Cosmic controller declined to start after preparation');
        emit('started');
        return true;
      } catch (error) {
        started = false;
        const detail = { stage: state, error };
        emit('error', detail);
        reportFailure(detail);
        return false;
      }
    },
    async retry() {
      if (disposed || started) return false;
      const oldController = controllerPromise;
      controllerPromise = null;
      preloadPromise = null;
      failureReported = false;
      emit('boot');
      try { await oldController?.then((controller) => controller?.dispose?.()); } catch {}
      try {
        await ensurePreloaded();
        return true;
      } catch {
        return false;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      emit('disposed');
      void controllerPromise?.then((controller) => controller?.dispose?.()).catch(() => {});
    },
  };
}

export function resolveCosmicSiteRoot(moduleUrl = import.meta.url) {
  return new URL('../', moduleUrl).href;
}

const PREPARATION_DIAGNOSTIC_VERSION = '20260928m';

export function createCosmicLayer(doc = globalThis.document) {
  const existing = doc?.querySelector?.('#cosmic-event-layer');
  if (existing) {
    if (!doc.querySelector('.cosmic-void-veil')) {
      const veil = doc.createElement('div');
      veil.className = 'cosmic-void-veil';
      veil.setAttribute('aria-hidden', 'true');
      doc.body.append(veil);
    }
    return existing;
  }
  if (!doc?.createElement || !doc?.body?.append) throw new Error('Cosmic layer requires a document body');
  const layer = doc.createElement('div');
  layer.id = 'cosmic-event-layer';
  layer.className = 'cosmic-event-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="cosmic-vfx-host"></div>
    <div class="cosmic-lavender-stage"></div>
    <div class="cosmic-flash" data-kind="white"></div>
  `;
  const veil = doc.createElement('div');
  veil.className = 'cosmic-void-veil';
  veil.setAttribute('aria-hidden', 'true');
  doc.body.append(veil, layer);
  return layer;
}

function createLoaderView(doc) {
  const root = doc?.querySelector?.('#cosmic-loader');
  const action = root?.querySelector?.('[data-loader-action]');
  if (!root || !action) return null;
  return {
    root,
    action,
    update(stage) {
      if (stage === 'started') {
        root.dataset.state = 'started';
        root.setAttribute('aria-hidden', 'true');
        return;
      }
      if (stage === 'disposed') return;
      root.dataset.state = stage;
      root.setAttribute('aria-busy', String(stage !== 'ready' && stage !== 'error'));
      const retrying = stage === 'error';
      action.disabled = !retrying && stage !== 'ready';
      action.setAttribute('aria-label', retrying ? 'Reintentar preparación' : 'Iniciar experiencia');
      action.dataset.mode = retrying ? 'retry' : 'start';
    },
  };
}

export function installProductionCosmicBootstrap({
  doc = globalThis.document,
  win = globalThis.window,
  runtimeLoader = () => import(`./production-runtime.js?prepdiag=${PREPARATION_DIAGNOSTIC_VERSION}`),
  moduleUrl = import.meta.url,
} = {}) {
  const siteRoot = resolveCosmicSiteRoot(moduleUrl);
  const loader = createLoaderView(doc);
  let bootstrap;
  bootstrap = installCosmicBootstrap({
    onProgress: (stage) => {
      loader?.update(stage);
      if (stage === 'ready') {
        void bootstrap.preload().then(async (controller) => {
          try {
            if (await controller?.canStartAutomatically?.()) void bootstrap.start();
          } catch (error) {
            console.info('[BOOT] audio requires a start gesture', error?.name ?? error?.message ?? error);
          }
        });
      }
    },
    createController: async () => {
      const layer = createCosmicLayer(doc);
      const runtimeUrl = new URL(`./production-runtime.js?prepdiag=${PREPARATION_DIAGNOSTIC_VERSION}`, moduleUrl).href;
      let runtime;
      try {
        runtime = await runtimeLoader();
      } catch (cause) {
        const error = new Error(`Cosmic runtime import failed: ${cause?.message ?? cause}`);
        error.name = cause?.name || error.name;
        error.stage = 'runtime-import';
        error.url = cause?.url || runtimeUrl;
        error.cause = cause;
        console.error('[PREP_FAILED]', {
          stage: error.stage, url: error.url, name: error.name,
          message: cause?.message ?? error.message, stack: cause?.stack ?? error.stack,
        });
        throw error;
      }
      return runtime.createProductionCosmicController({ doc, win, layer, siteRoot });
    },
  });

  loader?.action?.addEventListener?.('click', () => {
    if (bootstrap.status === 'error') void bootstrap.retry();
    else void bootstrap.start();
  });
  return bootstrap;
}

if (typeof document !== 'undefined') installProductionCosmicBootstrap();




