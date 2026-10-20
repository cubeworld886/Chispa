/* Chispa · Lavender en primera persona.
 * Integra burbujas sobre la escena cinematográfica original, sin TTS,
 * sin paneles de control y conservando el motor canónico del personaje.
 *
 * Respeta el ritmo de escritura, los tonos y la geometría de la burbuja
 * de LavenderSpeechBubble (Lyra POS); adaptación DOM/CSS, no Flutter.
 */
(() => {
  'use strict';
  if (new URLSearchParams(globalThis.location?.search || '').get('previewNarrative') !== '1') return;

  const SECTIONS = Object.freeze([
  {
    "key": "heavy",
    "feel": "curious",
    "cue": "hello",
    "lines": [
      "¿Has escuchado Heavy, de The Marías?",
      "Hay una parte de esa canción que no puedo escuchar sin ponerme a pensar.",
      "Yo siempre la he interpretado como si hablara de alguien a quien le advierten que no vuelva a entrar en algo que podría terminar ahogándolo. Y, aun así, lo hace.",
      "Y entonces se pregunta: ¿qué fue lo que hice?",
      "Como si de pronto se encontrara perdido entre todos sus pensamientos, entre todo lo que siente, porque en el fondo nunca quiso enamorarse de alguien más.",
      "Ni siquiera en otra vida.",
      "No sé si ese sea realmente el significado de la canción, pero es lo que yo siento cuando la escucho. Y, de alguna manera, me hace pensar en nosotros."
    ]
  },
  {
    "key": "encuentro",
    "feel": "reflect",
    "cue": null,
    "lines": [
      "¿Sabes? Recuerdo algo que me dijiste la última vez que nos vimos.",
      "Me dijiste que todavía le tenías fe a la vida. Que tal vez, después de muchos años, nuestros caminos podrían volver a encontrarse y quizá entonces podríamos ser felices juntos.",
      "He pensado mucho en eso.",
      "Y la verdad es que no sé si algún día vaya a suceder. Creo que hay cosas que simplemente no están en nuestras manos.",
      "Aunque, si soy sincero, tal vez esa posibilidad esté un poco más en las tuyas que en las mías.",
      "Porque, después de todo, quien te traicionó fui yo.",
      "Y por eso siento que no me corresponde buscarte. No después de todo lo que pasó, no después de todo lo que te hice sentir.",
      "A veces pienso que, si algún día intentara encontrarte, quizá ya no podría hacerlo. Tal vez porque hay lugares a los que uno ya no tiene derecho a regresar.",
      "Pero tú... tú siempre has sabido cómo encontrarme."
    ]
  },
  {
    "key": "apocalypse",
    "feel": "confess",
    "cue": "thinking",
    "lines": [
      "En Apocalypse, de Cigarettes After Sex, hay una parte que me hace pensar justo en eso.",
      "Dice: «Come on and haunt me».",
      "No sé cómo explicártelo, pero hay días en los que me identifico mucho con esas palabras.",
      "Porque, aunque decidimos soltarnos, a veces sí quisiera que volviéramos a encontrarnos. No sé cuándo ni cómo, pero hay momentos en los que todavía me gustaría volver a verte.",
      "Y no te lo digo para pedirte que me busques, ni porque espere que lo hagas. Simplemente es algo que todavía siento.",
      "Y me cuesta admitirlo porque también quiero que estés bien, que sigas con tu vida y que no sientas que tienes que volver a mirar hacia atrás."
    ]
  },
  {
    "key": "culpa",
    "feel": "regret",
    "cue": "thinking",
    "lines": [
      "Hay tantas cosas que hice, tantas decisiones que tomé, que todavía hoy no sé si algún día voy a poder perdonarme.",
      "Ni siquiera si estuviera contigo.",
      "Ni siquiera estando solo, sin nadie.",
      "Porque hay errores que no desaparecen simplemente porque pase el tiempo. Y por mucho que quisiera, no puedo cambiar lo que sucedió.",
      "A veces me pregunto cómo habría sido nuestra vida si yo no te hubiera roto.",
      "Si hubiera sabido amarte de otra manera. Si hubiera entendido antes las cosas que entiendo ahora.",
      "Y sé que no tiene sentido vivir imaginando una vida que ya no ocurrió, pero hay preguntas que aparecen incluso cuando uno intenta dejarlas atrás."
    ]
  },
  {
    "key": "volver-a-vernos",
    "feel": "tender",
    "cue": null,
    "lines": [
      "También he pensado mucho en aquel día que volvimos a vernos.",
      "Tal vez era algo que tú necesitabas.",
      "Yo, por mi parte, estaba convencido de que no lo necesitaba. Creía que había conseguido estar tranquilo, que había aprendido a seguir adelante, que finalmente estaba en paz con todo aquello.",
      "Pero sería mentirte decir que no fui feliz al volver a verte.",
      "Porque lo fui.",
      "Me hizo muy feliz.",
      "Y creo que eso es algo que todavía me cuesta aceptar.",
      "Porque, de alguna manera, y aunque a veces quisiera que fuera diferente, todavía te extraño.",
      "Todavía hay momentos en los que apareces en mis pensamientos sin que yo te haya llamado.",
      "Y no siempre sé qué hacer con eso.",
      "Cuando me hablaste de lo que sentías, hubo muchas cosas que entendí y otras tantas que no supe responderte.",
      "Pero creo que comprendo más de lo que imaginas.",
      "Porque es increíble pensar en todo lo que llegué a sentir por ti. En todo lo que realmente sentí. Y en cómo, después de tanto tiempo, todavía hay partes de ese amor que permanecen conmigo."
    ]
  },
  {
    "key": "raices",
    "feel": "tender",
    "cue": "talking",
    "lines": [
      "A veces siento que creciste dentro de mi alma como un árbol.",
      "Y que, mientras pasaban los días, los meses y los años, tus raíces fueron extendiéndose lentamente, abrazando partes de mí que ni siquiera sabía que existían.",
      "Hasta que llegó un momento en que dejaron de ser algo ajeno.",
      "Se volvieron parte de mí.",
      "Y aunque la vida haya seguido, aunque yo haya cambiado, aunque ambos hayamos conocido otras personas y vivido tantas cosas distintas, esas raíces siguen ahí.",
      "No sé cómo explicarlo mejor.",
      "Tampoco sé qué hacer con todo esto.",
      "Hay tantas preguntas que todavía me hago. Tantas cosas que he comprendido con el tiempo y que me habría gustado poder decirte cuando estuvimos frente a frente.",
      "Y quizá nunca tenga la oportunidad de hacerlo.",
      "Pero quería que, al menos en algún lugar, esas palabras existieran."
    ]
  },
  {
    "key": "despedida",
    "feel": "farewell",
    "cue": "thinking",
    "lines": [
      "No sé si la vida volverá a juntarnos. No sé si algún día seremos esas dos personas que imaginamos aquella vez.",
      "Y no quiero hacer de esa posibilidad una promesa, porque sería injusto para los dos.",
      "Lo único que sé es que, a pesar de todo, hay una parte de mí que todavía te quiere y te extraña.",
      "Y que, por encima de cualquier cosa que yo pudiera desear, de corazón espero que te vaya bien.",
      "Que encuentres tranquilidad.",
      "Que seas feliz.",
      "No quiero que sientas que tienes que hacer algo con estas palabras. No te estoy pidiendo que vuelvas, ni que me esperes, ni que cambies el rumbo de tu vida.",
      "Si algún día nuestros caminos vuelven a encontrarse, quisiera que fuera porque ambos lo deseamos, no porque alguno se sintiera obligado a regresar.",
      "Y si ese día nunca llega, también tendré que aprender a vivir con ello.",
      "Solo espero que la vida te trate con toda la ternura que yo no siempre supe darte."
    ]
  }
]);

  const CUE_FILES = Object.freeze({
    hello: 'assets/lavender/sfx/lavender_hello.wav',
    talking: 'assets/lavender/sfx/lavender_talking.wav',
    thinking: 'assets/lavender/sfx/lavender_thinking.wav',
  });
  const CUE_LEVELS = Object.freeze({ hello: 0.16, talking: 0.11, thinking: 0.12 });
  const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function paragraphsToPages() {
    return SECTIONS.flatMap((section, sectionIndex) => section.lines.map((text, lineIndex) => Object.freeze({
      text, feel: section.feel, section: section.key, sectionIndex, lineIndex,
      cue: lineIndex === 0 ? section.cue : null,
      pause: lineIndex === section.lines.length - 1 ? 1650 : 840,
    })));
  }
  const PAGES = Object.freeze(paragraphsToPages());

  class GentleVocalDirector {
    constructor(audio) {
      this.audio = audio;
      this.context = audio?.context ?? null;
      this.destination = audio?.getMixOutput?.() ?? this.context?.destination ?? null;
      this.buffers = new Map();
      this.ready = null;
      this.lastAt = -Infinity;
      this.activeSources = new Set();
      this.destroyed = false;
    }
    preload() {
      if (this.ready) return this.ready;
      if (!this.context || !this.destination) return Promise.resolve(false);
      this.ready = Promise.allSettled(Object.entries(CUE_FILES).map(async ([key, path]) => {
        const response = await fetch(new URL(path, document.baseURI).href);
        if (!response.ok) throw new Error('No se pudo descargar el sonido original ' + key);
        const data = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(data);
        if (this.destroyed) return;
        this.buffers.set(key, buffer);
      })).then((results) => {
        for (const item of results) {
          if (item.status === 'rejected') console.warn('[Chispa][Lavender] Sonido canónico no disponible.', item.reason);
        }
        return this.buffers.size > 0;
      });
      return this.ready;
    }
    play(key) {
      if (this.destroyed || !this.context || this.context.state !== 'running') return;
      if (!key || !this.buffers.has(key)) return;
      const at = this.context.currentTime;
      if (at - this.lastAt < 24) return;
      this.lastAt = at;
      try {
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        source.buffer = this.buffers.get(key);
        const volume = CUE_LEVELS[key] ?? 0.10;
        const duration = source.buffer.duration;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(volume, at + 0.055);
        gain.gain.setValueAtTime(volume, at + Math.max(.06, duration - .20));
        gain.gain.linearRampToValueAtTime(0, at + duration);
        source.connect(gain);
        gain.connect(this.destination);
        this.activeSources.add(source);
        source.onended = () => {
          this.activeSources.delete(source);
          try { source.disconnect(); gain.disconnect(); } catch {}
        };
        source.start(at);
      } catch (error) {
        console.warn('[Chispa][Lavender] Sonido discreto omitido.', error);
      }
    }
    destroy() {
      this.destroyed = true;
      for (const source of this.activeSources) {
        try { source.stop(); source.disconnect(); } catch {}
      }
      this.activeSources.clear();
      this.buffers.clear();
    }
  }

  class LavenderDialogueDirector {
    constructor({ lavender, audio, music }) {
      this.lavender = lavender;
      this.music = music;
      this.vocals = new GentleVocalDirector(audio);
      this.index = -1;
      this.charIndex = 0;
      this.page = null;
      this.clusters = [];
      this.timer = null;
      this.positionRaf = 0;
      this.lastPositionAt = 0;
      this.bubbleSize = { width: 0, height: 0 };
      this.lastPosition = { x: NaN, y: NaN, side: null };
      this.ended = false;
      this.started = false;
      this.destroyed = false;
      this.waitingVisibility = false;

      this.root = document.createElement('div');
      this.root.id = 'chispa-lavender-dialogue';
      this.root.className = 'lnv-bubble';
      this.root.setAttribute('role', 'group');
      this.root.setAttribute('aria-label', 'Palabras de Lavender');
      this.root.setAttribute('data-side', 'above');
      this.root.setAttribute('data-feel', 'curious');
      this.root.innerHTML =
        '<div class="lnv-copy">' +
        ' <span class="lnv-ghost" aria-hidden="true"></span>' +
        ' <span class="lnv-written" aria-hidden="true"></span>' +
        '</div>' +
        '<span class="lnv-spark" aria-hidden="true">✦</span>' +
        '<span class="lnv-for-sr" role="status" aria-live="polite" aria-atomic="true"></span>';
      document.body.append(this.root);
      this.ghost = this.root.querySelector('.lnv-ghost');
      this.written = this.root.querySelector('.lnv-written');
      this.spark = this.root.querySelector('.lnv-spark');
      this.sr = this.root.querySelector('.lnv-for-sr');
      this.onVisibility = this.onVisibility.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onPageHide = this.destroy.bind(this);
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('pagehide', this.onPageHide, { once: true });
      // Do not pause, restart or replace the original Dandara score.
      // This branch alone loops the existing score through the long letter.
      if (this.music?.track && !this.music.destroyed) this.music.track.loop = true;
      this.vocals.preload().catch(() => {});
    }
    start() {
      if (this.destroyed || this.started) return;
      this.started = true;
      this.positionRaf = requestAnimationFrame((t) => this.positionTick(t));
      this.schedule(() => this.advance(), 950);
    }
    schedule(fn, ms) {
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        this.timer = null;
        if (!this.destroyed && !document.hidden) fn();
        else if (!this.destroyed) this.waitingVisibility = true;
      }, ms);
    }
    actorRect() {
      try {
        const r = this.lavender?.engine?.getActorScreenRect?.();
        if (r && Number.isFinite(r.left) && Number.isFinite(r.top) && r.width > 0) {
          return r;
        }
      } catch {}
      const size = Math.max(65, Math.min(window.innerWidth, window.innerHeight) * 0.11);
      return {
        left: (window.innerWidth - size) / 2, top: (window.innerHeight - size) / 2,
        width: size, height: size, right: (window.innerWidth + size) / 2,
        bottom: (window.innerHeight + size) / 2,
      };
    }
    applyPose(page) {
      try {
        if (page.feel === 'regret' || page.feel === 'farewell') {
          this.lavender?.lookDown?.();
        } else if (page.feel === 'confess') {
          this.lavender?.lookAtWorldPoint?.(0.47, 0.59, { normalized: true });
        } else if (page.feel === 'tender') {
          this.lavender?.lookAtWorldPoint?.(0.53, 0.52, { normalized: true });
        } else {
          this.lavender?.lookAtWorldPoint?.(0.51, 0.48, { normalized: true });
        }
      } catch {}
    }
    advance() {
      if (this.destroyed || this.ended) return;
      this.index += 1;
      if (this.index >= PAGES.length) {
        this.finish();
        return;
      }
      this.page = PAGES[this.index];
      this.charIndex = 0;
      this.clusters = typeof Intl?.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(this.page.text), (item) => item.segment)
        : Array.from(this.page.text);
      this.root.classList.remove('is-visible', 'is-written');
      this.root.dataset.feel = this.page.feel;
      this.ghost.textContent = this.page.text;
      this.written.textContent = '';
      this.sr.textContent = this.page.text;
      this.spark.hidden = false;
      this.onResize();
      this.applyPose(this.page);
      if (this.page.cue) this.vocals.play(this.page.cue);
      // Allow the speech bubble to arrive with the same 470ms
      // organic entrance used in LavenderSpeechBubble.
      this.schedule(() => {
        this.root.classList.add('is-visible');
        this.schedule(() => this.typeNext(), reducedMotion ? 180 : 470);
      }, this.index === 0 ? 0 : 260);
    }
    typeNext() {
      if (this.destroyed || !this.page) return;
      if (reducedMotion) {
        this.written.textContent = this.page.text;
        this.showComplete();
        return;
      }
      if (this.charIndex >= this.clusters.length) {
        this.showComplete();
        return;
      }
      const next = this.clusters[this.charIndex];
      this.written.textContent += next;
      this.charIndex += 1;
      let delay = 27 + ((this.charIndex * 17 + this.index * 7) % 13);
      if (next === ' ') delay = 18;
      if (',;:'.includes(next)) delay += 70;
      if ('.!?'.includes(next)) delay += 130;
      if (next === '…') delay += 170;
      this.schedule(() => this.typeNext(), delay);
    }
    showComplete() {
      this.spark.hidden = true;
      this.root.classList.add('is-written');
      this.schedule(() => {
        this.root.classList.remove('is-visible');
        this.schedule(() => this.advance(), this.page?.pause ?? 840);
      }, this.page?.text.length < 38 ? 1700 : 1450);
    }
    positionTick(now) {
      if (this.destroyed || this.ended) return;
      this.positionRaf = requestAnimationFrame((t) => this.positionTick(t));
      if (now - this.lastPositionAt < 95 || !this.page || document.hidden) return;
      this.lastPositionAt = now;
      this.place();
    }
    onResize() {
      const w = Math.min(286, Math.max(180, window.innerWidth - 34));
      this.root.style.width = w + 'px';
      this.bubbleSize.width = w;
      this.bubbleSize.height = this.root.offsetHeight || 0;
      this.place();
    }
    place() {
      if (!this.page || this.destroyed) return;
      const r = this.actorRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const safeTop = 14;
      const safeBottom = 14;
      const space = 20;
      const bw = this.bubbleSize.width || 286;
      const bh = this.bubbleSize.height || this.root.offsetHeight || 130;
      const cx = r.left + r.width * .50;
      const cy = r.top + r.height * .50;
      const goRight = vw > 660 && r.right + space + bw < vw - 24;
      const goLeft = vw > 660 && r.left - space - bw > 24;
      let side = 'above';
      let x;
      let y;
      if (goRight) {
        side = 'right';
        x = r.right + space;
        y = cy - bh * .67;
      } else if (goLeft) {
        side = 'left';
        x = r.left - space - bw;
        y = cy - bh * .67;
      } else {
        x = cx - bw * .50;
        const availableAbove = r.top - safeTop - space;
        const availableBelow = vh - safeBottom - r.bottom - space;
        if (availableAbove >= bh || availableAbove >= availableBelow) {
          side = 'above';
          y = r.top - space - bh;
        } else {
          side = 'below';
          y = r.bottom + space;
        }
      }
      x = clamp(x, 12, Math.max(12, vw - bw - 12));
      y = clamp(y, safeTop, Math.max(safeTop, vh - bh - safeBottom));
      const anchor = side === 'above' || side === 'below'
        ? clamp(cx - x, 24, bw - 24) : clamp(cy - y, 25, Math.max(25, bh - 25));
      if (Math.abs(x - this.lastPosition.x) >= 0.4 || Math.abs(y - this.lastPosition.y) >= 0.4 || side !== this.lastPosition.side) {
        this.root.style.left = x.toFixed(1) + 'px';
        this.root.style.top = y.toFixed(1) + 'px';
        this.root.dataset.side = side;
        this.root.style.setProperty('--lnv-tail-at', anchor.toFixed(1) + 'px');
        this.lastPosition = { x, y, side };
      }
    }
    onVisibility() {
      if (this.destroyed) return;
      if (document.hidden) {
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
        this.waitingVisibility = true;
      } else if (this.waitingVisibility) {
        this.waitingVisibility = false;
        // Resume from the displayed character, never jump over an unread phrase.
        if (!this.page) this.schedule(() => this.advance(), 250);
        else if (this.charIndex >= this.clusters.length) this.schedule(() => this.showComplete(), 700);
        else {
          this.root.classList.add('is-visible');
          this.schedule(() => this.typeNext(), 350);
        }
      }
    }
    finish() {
      this.ended = true;
      this.root.classList.remove('is-visible');
      if (this.positionRaf) cancelAnimationFrame(this.positionRaf);
      this.positionRaf = 0;
      this.schedule(() => this.root.remove(), 1000);
    }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      if (this.positionRaf) cancelAnimationFrame(this.positionRaf);
      this.positionRaf = 0;
      this.vocals.destroy();
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pagehide', this.onPageHide);
      this.root.remove();
    }
    getStatus() {
      return Object.freeze({
        state: this.destroyed ? 'disposed' : this.ended ? 'completed' : this.started ? 'running' : 'preparing',
        index: this.index, total: PAGES.length, section: this.page?.section ?? null,
        typed: this.charIndex, totalCharacters: this.clusters.length,
        audioMode: 'original-music-and-occasional-canonical-vocal-cues',
        speechSynthesis: false,
      });
    }
  }

  let director = null;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('cosmic/narrative-preview.css', document.baseURI).href;
  document.head.append(css);

  const onCosmicIdle = (event) => {
    if (director) return;
    const { lavender, audio, music } = event.detail ?? {};
    if (!lavender?.engine) {
      console.warn('[Chispa][Lavender] No se encontró el renderizador canónico al llegar al reposo.');
      return;
    }
    director = new LavenderDialogueDirector({ lavender, audio, music });
    director.start();
    console.info('[Chispa][Lavender] Narración automática iniciada.', PAGES.length, 'burbujas');
  };

  window.addEventListener('chispa:cosmic-idle', onCosmicIdle, { once: true });
  window.__chispaNarrativePreview = Object.freeze({
    getStatus: () => director?.getStatus() ?? Object.freeze({ state: 'waiting-for-cosmic-idle', total: PAGES.length }),
  });
})();
