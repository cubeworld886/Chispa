/* Chispa · Vista previa narrativa.
 * Solo se activa con ?previewNarrative=1.
 * Conserva el renderizador canónico de Lavender y NO incluye el monólogo privado completo.
 */
(() => {
  if (new URLSearchParams(window.location.search).get('previewNarrative') !== '1') return;

  const CHAPTERS = Object.freeze([
    {
      label: 'I · Una canción',
      cue: 'open',
      text: '¿Has escuchado Heavy, de The Marías? Hay una parte de esa canción que siempre me hace pensar en lo extraño que es seguir sintiendo algo que creíamos haber dejado atrás. A veces pienso que no quería enamorarme de alguien más, ni siquiera en otra vida.'
    },
    {
      label: 'II · Aquella vez',
      cue: 'reflect',
      text: 'Cuando volvimos a vernos, yo creía que ya había encontrado cierta tranquilidad. Pero sería mentirte decir que no me hizo feliz volver a verte. Me hizo muy feliz. Y todavía hay cosas que quisiera haberte dicho entonces.'
    },
    {
      label: 'III · Apocalypse',
      cue: 'confess',
      text: 'Hay otra canción que me recuerda a ti. Apocalypse, de Cigarettes After Sex. Hay una parte que escucho como una súplica a alguien que se fue: vuelve a rondarme, aunque sea solo como un recuerdo. Y no te voy a mentir. A veces una parte de mí también desea eso. Que de algún modo vuelvas a encontrarme, aunque yo no pueda buscarte.'
    },
    {
      label: 'IV · Encontrarme',
      cue: 'hope',
      text: 'Pero no quiero que confundas ese deseo con una petición. Sé que elegimos soltarnos y quiero respetarlo. Solo intento explicarte una contradicción que todavía llevo dentro: puedo desearte paz, incluso lejos de mí, y al mismo tiempo seguir extrañándote.'
    },
    {
      label: 'V · Las raíces',
      cue: 'tender',
      text: 'A veces siento que creciste dentro de mi alma como un árbol. Que tus raíces fueron atándose a lugares de mí que ni siquiera sabía que existían. Y que, de alguna manera, terminaron formando parte de lo que soy.'
    },
    {
      label: 'VI · Sin exigencias',
      cue: 'farewell',
      text: 'No sé si la vida volverá a juntarnos. No te estoy pidiendo que vuelvas, que me busques, ni que cambies nada. Solo quería que estas palabras existieran en algún lugar. Y, por encima de todo, espero de corazón que te vaya bien.'
    }
  ]);

  const state = {
    index: 0, playing: false, mode: 'silent', token: 0,
    timeout: null, opened: false, actor: null, music: null, targets: null
  };

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = './cosmic/narrative-preview.css';
  document.head.append(css);

  const panel = document.createElement('section');
  panel.id = 'chispa-narrative-preview';
  panel.className = 'lnp-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Vista previa de la narración de Lavender');
  panel.hidden = true;
  panel.innerHTML = `
    <div class="lnp-eyebrow"><span class="lnp-sparkle" aria-hidden="true">✧</span> CHISPA <span class="lnp-sep">/</span> VISTA DE PRUEBA</div>
    <button class="lnp-close" type="button" data-action="close" aria-label="Cerrar narración">×</button>
    <div class="lnp-intro">
      <h1>Hay cosas que<br><em>no supe decir.</em></h1>
      <p>Una primera prueba de Lavender como voz de una historia que todavía tiene palabras pendientes.</p>
      <div class="lnp-intro-actions">
        <button class="lnp-primary" type="button" data-action="listen">Escuchar a Lavender <span aria-hidden="true">↗</span></button>
        <button class="lnp-secondary" type="button" data-action="read">Leer en silencio</button>
      </div>
      <p class="lnp-disclaimer">Seis fragmentos de ensayo. La voz proviene de tu navegador; no es la locución definitiva.</p>
    </div>
    <div class="lnp-reading" hidden>
      <div class="lnp-chapter-label" id="lnp-chapter-label"></div>
      <p class="lnp-spoken" id="lnp-spoken" aria-live="off"></p>
      <div class="lnp-progress-row">
        <span id="lnp-count"></span>
        <div class="lnp-progress" role="progressbar" aria-label="Avance de la narración" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="lnp-progress-fill"></span></div>
        <span id="lnp-status"></span>
      </div>
      <div class="lnp-controls">
        <button type="button" data-action="prev" aria-label="Fragmento anterior">← <span>Anterior</span></button>
        <button type="button" data-action="toggle" id="lnp-toggle" class="lnp-play">▶ <span>Escuchar</span></button>
        <button type="button" data-action="next" aria-label="Fragmento siguiente"><span>Siguiente</span> →</button>
      </div>
    </div>
    <div class="lnp-end" hidden>
      <p class="lnp-end-symbol" aria-hidden="true">✧</p>
      <h2>Y si nunca lo escuchas…</h2>
      <p>al menos estas palabras habrán existido.</p>
      <button type="button" class="lnp-primary" data-action="restart">Escuchar de nuevo ↗</button>
    </div>
    <div class="lnp-watermark">LAVENDER · MOTOR CANÓNICO · ENSAYO</div>
  `;
  document.body.append(panel);

  const launcher = document.createElement('button');
  launcher.id = 'lnp-launcher';
  launcher.className = 'lnp-launcher';
  launcher.textContent = 'Volver a la narración ✧';
  launcher.type = 'button';
  launcher.hidden = true;
  launcher.addEventListener('click', openPanel);
  document.body.append(launcher);

  const intro = panel.querySelector('.lnp-intro');
  const reading = panel.querySelector('.lnp-reading');
  const end = panel.querySelector('.lnp-end');
  const spoken = panel.querySelector('#lnp-spoken');
  const chapterLabel = panel.querySelector('#lnp-chapter-label');
  const count = panel.querySelector('#lnp-count');
  const status = panel.querySelector('#lnp-status');
  const progress = panel.querySelector('.lnp-progress');
  const progressFill = panel.querySelector('#lnp-progress-fill');
  const toggleButton = panel.querySelector('#lnp-toggle');

  function clearPendingAudio() {
    state.token += 1;
    if (state.timeout !== null) clearTimeout(state.timeout);
    state.timeout = null;
    try { window.speechSynthesis?.cancel(); } catch {}
  }
  function silenceBackground() {
    try { state.music?.track?.pause?.(); } catch {}
    document.querySelectorAll('audio').forEach((element) => {
      try { element.pause(); } catch {}
    });
  }
  function posture(index) {
    const actor = state.actor;
    if (!actor) return;
    const cue = CHAPTERS[index].cue;
    try {
      actor.engine?.resumeAnimation?.();
      if (cue === 'reflect' || cue === 'confess' || cue === 'farewell') actor.lookDown?.();
      else if (cue === 'tender') actor.lookAtWorldPoint?.(0.47, 0.53, { normalized: true });
      else actor.lookAtWorldPoint?.(0.50, 0.47, { normalized: true });
    } catch (error) {
      console.warn('[Chispa][Narrative] No se pudo actualizar la mirada canónica.', error);
    }
  }
  function stopIdleForDialogue() {
    try { state.actor?.idle?.stop?.(); } catch {}
    try { state.actor?.engine?.resumeAnimation?.(); } catch {}
  }
  function resumeIdle() {
    try {
      if (state.actor && typeof state.actor.startMelancholicIdle === 'function') {
        state.actor.startMelancholicIdle(state.targets ?? (() => []));
      }
    } catch (error) {
      console.warn('[Chispa][Narrative] No se pudo reanudar el movimiento de reposo.', error);
    }
  }
  function renderChapter() {
    const chapter = CHAPTERS[state.index];
    chapterLabel.textContent = chapter.label;
    spoken.textContent = chapter.text;
    count.textContent = String(state.index + 1).padStart(2, '0') + ' / ' + String(CHAPTERS.length).padStart(2, '0');
    const pct = Math.round(((state.index + 1) / CHAPTERS.length) * 100);
    progressFill.style.width = pct + '%';
    progress.setAttribute('aria-valuenow', String(pct));
    const canSpeak = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
    status.textContent = state.mode === 'voice'
      ? (canSpeak ? (state.playing ? 'REPRODUCIENDO' : 'EN PAUSA') : 'VOZ NO DISPONIBLE')
      : 'LECTURA';
    toggleButton.innerHTML = state.playing ? 'Ⅱ <span>Pausar</span>' : '▶ <span>Escuchar</span>';
    panel.querySelector('[data-action="prev"]').disabled = state.index === 0;
    panel.querySelector('[data-action="next"] span').textContent = state.index === CHAPTERS.length - 1 ? 'Finalizar' : 'Siguiente';
    posture(state.index);
  }
  function pickSpanishVoice() {
    try {
      const voices = window.speechSynthesis.getVoices();
      return voices.find((voice) => /^es-MX$/i.test(voice.lang))
        || voices.find((voice) => /^es/i.test(voice.lang)) || null;
    } catch { return null; }
  }
  function speakChapter() {
    clearPendingAudio();
    if (!state.playing || state.mode !== 'voice') return;
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      state.playing = false;
      state.mode = 'silent';
      renderChapter();
      return;
    }
    const token = state.token;
    const utterance = new SpeechSynthesisUtterance(CHAPTERS[state.index].text);
    utterance.lang = 'es-MX';
    utterance.rate = 0.88;
    utterance.pitch = 1.01;
    utterance.volume = 0.94;
    const voice = pickSpanishVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (!state.playing || token !== state.token || !state.opened) return;
      state.timeout = setTimeout(() => {
        if (token !== state.token || !state.playing || !state.opened) return;
        if (state.index === CHAPTERS.length - 1) {
          finishNarration();
          return;
        }
        state.index += 1;
        renderChapter();
        speakChapter();
      }, 900);
    };
    utterance.onerror = (event) => {
      if (token !== state.token) return;
      console.warn('[Chispa][Narrative] Voz del navegador no disponible.', event.error);
      state.playing = false;
      renderChapter();
    };
    try { window.speechSynthesis.speak(utterance); }
    catch (error) {
      console.warn('[Chispa][Narrative] No fue posible iniciar la locución.', error);
      state.playing = false;
      renderChapter();
    }
  }
  function showReading(mode = 'silent') {
    clearPendingAudio();
    state.index = 0;
    state.mode = mode;
    state.playing = mode === 'voice';
    intro.hidden = true;
    reading.hidden = false;
    end.hidden = true;
    stopIdleForDialogue();
    if (mode === 'voice') silenceBackground();
    renderChapter();
    if (state.playing) speakChapter();
  }
  function finishNarration() {
    clearPendingAudio();
    state.playing = false;
    intro.hidden = true;
    reading.hidden = true;
    end.hidden = false;
    resumeIdle();
  }
  function openPanel() {
    state.opened = true;
    panel.hidden = false;
    launcher.hidden = true;
    if (!intro.hidden && reading.hidden && end.hidden) return;
    if (!end.hidden) return;
    stopIdleForDialogue();
    renderChapter();
  }
  function closePanel() {
    clearPendingAudio();
    state.playing = false;
    state.opened = false;
    panel.hidden = true;
    launcher.hidden = false;
    resumeIdle();
  }
  function jump(delta) {
    clearPendingAudio();
    if (delta > 0 && state.index === CHAPTERS.length - 1) {
      finishNarration();
      return;
    }
    state.index = Math.max(0, Math.min(CHAPTERS.length - 1, state.index + delta));
    renderChapter();
    if (state.playing && state.mode === 'voice') speakChapter();
  }
  panel.addEventListener('click', (event) => {
    const action = event.target.closest('button[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'close') closePanel();
    else if (action === 'listen') showReading('voice');
    else if (action === 'read') showReading('silent');
    else if (action === 'prev') jump(-1);
    else if (action === 'next') jump(1);
    else if (action === 'restart') showReading('voice');
    else if (action === 'toggle') {
      if (state.playing) {
        clearPendingAudio();
        state.playing = false;
      } else {
        state.mode = 'voice';
        state.playing = true;
        silenceBackground();
      }
      renderChapter();
      if (state.playing) speakChapter();
    }
  });

  window.addEventListener('chispa:cosmic-idle', (event) => {
    state.actor = event.detail?.lavender ?? null;
    state.music = event.detail?.music ?? null;
    state.targets = event.detail?.getResidualTargets ?? (() => []);
    if (!state.actor?.engine) {
      console.warn('[Chispa][Narrative] El actor canónico todavía no está disponible.');
      return;
    }
    console.info('[Chispa][Narrative] Motor canónico conectado; seis fragmentos listos.');
    openPanel();
  }, { once: true });
  window.addEventListener('pagehide', () => {
    clearPendingAudio();
    state.playing = false;
  });
  window.__chispaNarrativePreview = Object.freeze({
    getStatus: () => Object.freeze({
      opened: state.opened, index: state.index, mode: state.mode,
      playing: state.playing, chapters: CHAPTERS.length
    }),
    open: openPanel
  });
})();
