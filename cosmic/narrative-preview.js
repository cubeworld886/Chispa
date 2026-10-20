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
      "En Apocalypse, de Cigarettes After Sex, hay una parte que me hace sentir justo así.",
      "Esa donde dice «Come on and haunt me».",
      "No sé, a veces quisiera que volviéramos a encontrarnos. Quisiera volver a verte, aunque fuera una sola vez.",
      "Me duele pensarlo porque sé que decidimos soltarnos y que eso significa respetar la vida que cada uno está tratando de llevar.",
      "No te digo esto para pedirte que me busques. Sé lo que acordamos y quiero respetarlo.",
      "Simplemente hay días en los que todavía te extraño muchísimo, y me cuesta aceptar que tal vez no vuelva a verte."
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
      "Y aunque me duela admitirlo, entiendo que quizá ya no volvamos a estar juntos. No es lo que yo quisiera, pero lo acepto. Todavía te quiero y me pesa muchísimo lo que pasó entre nosotros. Perdón por todo lo que te hice. Espero que estés bien, de verdad."
    ]
  }
]);

  // The original expressive states, authored in the canonical Lavender motion rig.
  // Short beats always flow back to lament so her slow natural breathing survives.
  const ACTING = Object.freeze({
    heavy: ['curious','thinking','confused','curious','concerned','lament','thinking'],
    encuentro: ['attentive','thinking','lament','concerned','concerned','lament','concerned','thinking','attentive'],
    apocalypse: ['curious','thinking','concerned','lament','attentive','relieved'],
    culpa: ['concerned','lament','lament','concerned','lament','thinking','lament'],
    'volver-a-vernos': ['thinking','attentive','thinking','relieved','attentive','relieved','thinking','lament','thinking','lament','attentive','thinking','lament'],
    raices: ['lament','thinking','attentive','lament','thinking','attentive','lament','thinking','lament','attentive'],
    despedida: ['lament','thinking','lament','attentive','relieved','relieved','concerned','attentive','lament','relieved'],
  });

  // The cues are approved recordings from Lyra POS, never synthesized speech.
  // They are chapter/meaning-specific rather than playing for every sentence.
  const VOCAL_FILES = Object.freeze({
    hello: 'assets/lavender/sfx/lavender_hello.wav',
    talking: 'assets/lavender/sfx/lavender_talking.wav',
    thinking: 'assets/lavender/sfx/lavender_thinking.wav',
    yes: 'assets/lavender/sfx/lavender_yes.wav',
    no: 'assets/lavender/sfx/lavender_no.wav',
    absorb: 'assets/lavender/sfx/lavender_absorb.wav',
    excited: 'assets/lavender/sfx/lavender_excited.wav',
    laugh: 'assets/lavender/sfx/lavender_laugh.wav',
    sad: 'assets/cosmic/sfx/lavender-sad.wav',
  });
  const VOCAL_LEVELS = Object.freeze({
    hello: .23, talking: .19, thinking: .20, yes: .18, no: .17,
    absorb: .19, excited: .16, laugh: .13, sad: .17,
  });
  const CUE_BEATS = Object.freeze({
    heavy: { 0:'hello', 4:'thinking' },
    encuentro: { 1:'yes', 5:'no', 8:'talking' },
    apocalypse: { 0:'thinking', 2:'absorb', 5:'sad' },
    culpa: { 0:'sad', 4:'no' },
    'volver-a-vernos': { 0:'thinking', 3:'excited', 5:'laugh', 8:'absorb', 12:'talking' },
    raices: { 0:'absorb', 3:'yes', 7:'thinking' },
    despedida: { 0:'sad', 3:'talking', 6:'thinking', 9:'absorb' },
  });
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const nowMs = () => globalThis.performance?.now?.() ?? Date.now();

  function pagesFromSections() {
    return SECTIONS.flatMap((section, sectionIndex) => section.lines.map((text, lineIndex) => Object.freeze({
      text, feel: section.feel, section: section.key, sectionIndex, lineIndex,
      acting: ACTING[section.key]?.[lineIndex] ?? 'lament',
      vocal: CUE_BEATS[section.key]?.[lineIndex] ?? null,
      pause: lineIndex === section.lines.length - 1 ? 1600 : 800,
    })));
  }
  const PAGES = Object.freeze(pagesFromSections());

  class GentleVocalDirector {
    constructor(audio, music) {
      this.context = audio?.context ?? null;
      this.destination = audio?.getMixOutput?.() ?? this.context?.destination ?? null;
      this.music = music;
      this.buffers = new Map();
      this.ready = null;
      this.lastAt = -Infinity;
      this.cuesPlayed = 0;
      this.activeSources = new Set();
      this.destroyed = false;
    }
    preload() {
      if (this.ready) return this.ready;
      if (!this.context || !this.destination) return Promise.resolve(false);
      this.ready = Promise.allSettled(Object.entries(VOCAL_FILES).map(async ([key, path]) => {
        const response = await fetch(new URL(path, document.baseURI).href);
        if (!response.ok) throw new Error('No se pudo descargar ' + key + ': HTTP ' + response.status);
        const wav = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(wav);
        if (!this.destroyed) this.buffers.set(key, buffer);
      })).then((results) => {
        for (const result of results) {
          if (result.status === 'rejected') console.warn('[Chispa][Lavender] Audio omitido.', result.reason);
        }
        console.info('[Chispa][Lavender] Vocalizaciones preparadas:', this.buffers.size);
        return this.buffers.size > 0;
      });
      return this.ready;
    }
    play(key, stillRelevant = () => true) {
      if (this.destroyed || !key || !VOCAL_FILES[key]) return false;
      if (!this.buffers.has(key)) {
        // Safari can defer small audio fetches. Replay only while this same
        // passage is still being shown; never voice an old page later.
        this.ready?.then(() => {
          if (!this.destroyed && stillRelevant() && this.buffers.has(key)) this.play(key, stillRelevant);
        }).catch(() => {});
        return false;
      }
      if (!stillRelevant() || !this.context || this.context.state !== 'running') return false;
      const at = this.context.currentTime;
      if (at - this.lastAt < 15) return false;
      const buffer = this.buffers.get(key);
      if (!buffer || buffer.duration <= 0) return false;
      try {
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        const level = VOCAL_LEVELS[key] ?? .17;
        const duration = buffer.duration;
        source.buffer = buffer;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(level, at + .06);
        gain.gain.setValueAtTime(level, at + Math.max(.08, duration - .22));
        gain.gain.linearRampToValueAtTime(0, at + duration);
        source.connect(gain);
        gain.connect(this.destination);
        const musicGain = this.music?.gainNode?.gain;
        if (musicGain && this.music?.primed && !this.music.destroyed) {
          const base = this.music.gainValue ?? .68;
          // Mild side-chain duck for the brief non-verbal reaction, not a pause.
          musicGain.cancelScheduledValues(at);
          musicGain.setValueAtTime(base, at);
          musicGain.linearRampToValueAtTime(base * .84, at + .10);
          musicGain.setValueAtTime(base * .84, at + Math.max(.11, duration - .10));
          musicGain.linearRampToValueAtTime(base, at + duration + .30);
        }
        this.lastAt = at;
        this.cuesPlayed += 1;
        this.activeSources.add(source);
        source.onended = () => {
          this.activeSources.delete(source);
          try { source.disconnect(); gain.disconnect(); } catch {}
        };
        source.start(at);
        return true;
      } catch (error) {
        console.warn('[Chispa][Lavender] No se pudo reproducir ' + key, error);
        return false;
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
    constructor({ lavender, audio, music, getResidualTargets }) {
      this.lavender = lavender;
      this.music = music;
      this.residualTargets = getResidualTargets ?? (() => []);
      this.vocals = new GentleVocalDirector(audio, music);
      this.index = -1;
      this.charIndex = 0;
      this.page = null;
      this.clusters = [];
      this.letters = [];
      this.timer = null;
      this.actingTimers = new Set();
      this.positionRaf = 0;
      this.returnRaf = 0;
      this.lastPositionAt = 0;
      this.bubbleSize = { width: 0, height: 0 };
      this.lastPosition = { x: NaN, y: NaN, side: null };
      this.ended = false;
      this.started = false;
      this.destroyed = false;
      this.waitingVisibility = false;
      this.currentActing = 'lament';
      this.initialCenterX = lavender?.baseSceneView?.centerX ?? .5;
      this.stageFromX = this.initialCenterX;
      this.stageTargetX = this.targetCenterX();
      this.stageStartedAt = 0;
      this.ambientPhase = Math.round(Math.random() * 500);
      this.lastRenderAt = 0;

      this.root = document.createElement('div');
      this.root.id = 'chispa-lavender-dialogue';
      this.root.className = 'lnv-bubble';
      this.root.setAttribute('role', 'group');
      this.root.setAttribute('aria-label', 'Palabras de Lavender');
      this.root.setAttribute('data-side', 'left');
      this.root.setAttribute('data-feel', 'curious');
      this.root.innerHTML =
        '<div class="lnv-copy">' +
        ' <span class="lnv-written" aria-hidden="true"></span>' +
        '</div>' +
        '<span class="lnv-spark" aria-hidden="true">✦</span>' +
        '<span class="lnv-for-sr" role="status" aria-live="polite" aria-atomic="true"></span>';
      document.body.append(this.root);
      this.written = this.root.querySelector('.lnv-written');
      this.spark = this.root.querySelector('.lnv-spark');
      this.sr = this.root.querySelector('.lnv-for-sr');

      this.onVisibility = this.onVisibility.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onPageHide = this.destroy.bind(this);
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('pagehide', this.onPageHide, { once: true });
      // The actor stays truly animated by LavenderSvgEngine (not a static mock).
      // Pause her random idle gazes to let the scripted acting beats be deliberate.
      this.lavender?.idle?.stop?.();
      this.lavender?.engine?.resumeAnimation?.();
      // The cinematic performance rig was left locked by the intro. That
      // deliberately disables full body morphs (including the thinking
      // galaxy). Unlock only AFTER the original cinematic has finished.
      this.lavender?.engine?.setCinematicLock?.(false);
      this.lavender?.engine?.setCinematicPerformance?.(true);
      this.lavender?.engine?.setState?.('attentive');
      if (this.music?.track && !this.music.destroyed) this.music.track.loop = true;
      this.vocals.preload().catch(() => {});
    }
    targetCenterX() {
      return window.innerWidth <= 640 ? .81 : this.initialCenterX;
    }
    start() {
      if (this.destroyed || this.started) return;
      this.started = true;
      this.positionRaf = requestAnimationFrame((time) => this.positionTick(time));
      // Give Lavender time to move gently to her reading position.
      this.schedule(() => this.advance(), reducedMotion ? 600 : (window.innerWidth <= 640 ? 2150 : 850));
    }
    schedule(fn, ms) {
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        this.timer = null;
        if (!this.destroyed && !document.hidden) fn();
        else if (!this.destroyed) this.waitingVisibility = true;
      }, ms);
    }
    addActingTimer(fn, ms) {
      const timer = window.setTimeout(() => {
        this.actingTimers.delete(timer);
        if (!this.destroyed && !this.ended && !document.hidden) fn();
      }, ms);
      this.actingTimers.add(timer);
    }
    clearActingTimers() {
      for (const timer of this.actingTimers) clearTimeout(timer);
      this.actingTimers.clear();
    }
    actorRect() {
      try {
        const rect = this.lavender?.engine?.getActorScreenRect?.();
        if (rect && Number.isFinite(rect.left) && rect.width > 0) return rect;
      } catch {}
      const size = Math.max(65, Math.min(window.innerWidth, window.innerHeight) * .11);
      return {
        left: (window.innerWidth - size) / 2, top: (window.innerHeight - size) / 2,
        width: size, height: size, right: (window.innerWidth + size) / 2,
        bottom: (window.innerHeight + size) / 2,
      };
    }
    segmentText(input) {
      if (globalThis.Intl?.Segmenter) {
        const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(input), (part) => part.segment);
      }
      return Array.from(input);
    }
    createStableLetters(text) {
      // All words and graphemes exist IN NORMAL FLOW before typing starts.
      // Revealing their opacity cannot cause wrap changes or vertical jumping.
      const fragment = document.createDocumentFragment();
      const characters = [];
      const letterNodes = [];
      for (const token of text.match(/\s+|\S+/gu) ?? []) {
        if (/^\s+$/u.test(token)) {
          const node = document.createTextNode(token);
          fragment.appendChild(node);
          for (const ch of this.segmentText(token)) {
            characters.push(ch);
            letterNodes.push(null);
          }
        } else {
          const word = document.createElement('span');
          word.className = 'lnv-word';
          for (const ch of this.segmentText(token)) {
            const letter = document.createElement('span');
            letter.className = 'lnv-letter';
            letter.textContent = ch;
            word.appendChild(letter);
            characters.push(ch);
            letterNodes.push(letter);
          }
          fragment.appendChild(word);
        }
      }
      this.written.replaceChildren(fragment);
      this.clusters = characters;
      this.letters = letterNodes;
    }
    performanceFor(page) {
      return ACTING[page.section]?.[page.lineIndex] ?? 'lament';
    }
    act(page) {
      const rig = this.lavender?.engine;
      if (!rig) return;
      this.clearActingTimers();
      const state = this.performanceFor(page);
      this.currentActing = state;
      try {
        rig.setState?.(state);
        const softer = state === 'lament' || state === 'concerned';
        rig.setHeadTurn?.(state === 'curious' || state === 'thinking' ? -.060 : state === 'relieved' ? .035 : -.015);
        const thinkingMorph = state === 'thinking';
        rig.setCinematicFocus?.(thinkingMorph ? .26 : state === 'relieved' ? .21 : .13);
        rig.setOrientationYaw?.(thinkingMorph ? -.08 : state === 'curious' ? -.17 : state === 'attentive' ? -.21 : state === 'relieved' ? .08 : -.035);
        rig.setSceneMotion?.({
          orbitOpacity: softer ? .25 : .38,
          crescentOpacity: softer ? .26 : .39,
          star0Opacity: softer ? .13 : .24,
          star1Opacity: softer ? .11 : .20,
          star2Opacity: softer ? .10 : .18,
        });
        if (state === 'lament' || state === 'concerned') {
          this.lavender.lookDown?.();
        } else if (state === 'thinking' || state === 'confused') {
          this.lavender.lookAtWorldPoint?.(.36, .47, { normalized: true });
        } else {
          // Lavender occasionally reads her own bubble rather than looking
          // into the camera for every single sentence.
          this.lavender.lookAtWorldPoint?.(.27, .49, { normalized: true });
        }
      } catch (error) {
        console.warn('[Chispa][Lavender] Acting beat failed', error);
      }
      if (state !== 'lament') {
        // Hold the expressive state long enough to act, then return to
        // Lavender's long-breath canonical melancholy rather than freezing it.
        const hold = clamp(2800 + page.text.length * 24, 3600, 7400);
        this.addActingTimer(() => {
          rig.setState?.('lament');
          this.currentActing = 'lament';
          if (page.feel === 'regret' || page.feel === 'farewell') this.lavender.lookDown?.();
          else this.lavender.lookAtWorldPoint?.(.36, .52, { normalized: true });
        }, hold);
      } else {
        this.addActingTimer(() => {
          this.lavender.lookAtWorldPoint?.(.46, .55, { normalized: true });
        }, clamp(1200 + page.text.length * 11, 1600, 3600));
      }
    }
    advance() {
      if (this.destroyed || this.ended) return;
      this.clearActingTimers();
      this.index += 1;
      if (this.index >= PAGES.length) return this.finish();
      this.page = PAGES[this.index];
      const remaining = PAGES.length - this.index;
      // Eleven messages before the end: lower the prairie sound one passage
      // at a time. Seven before the end: start Yo Quisiera with a slow fade.
      if (remaining >= 7 && remaining <= 11) this.music?.fadePrimaryForRemaining?.(remaining);
      if (remaining === 7) this.music?.startNarrativeOutro?.();
      this.charIndex = 0;
      this.root.classList.remove('is-visible', 'is-written');
      this.root.dataset.feel = this.page.feel;
      this.createStableLetters(this.page.text);
      this.sr.textContent = this.page.text;
      this.spark.hidden = false;
      this.onResize();
      this.act(this.page);
      if (this.page.vocal) {
        const currentPage = this.index;
        this.vocals.play(this.page.vocal, () => this.index === currentPage && !this.destroyed && !this.ended);
      }
      this.schedule(() => {
        this.root.classList.add('is-visible');
        this.schedule(() => this.typeNext(), reducedMotion ? 80 : 370);
      }, this.index === 0 ? 0 : 190);
    }
    typeNext() {
      if (this.destroyed || !this.page) return;
      if (reducedMotion) {
        for (const node of this.letters) if (node) node.classList.add('is-revealed');
        this.charIndex = this.clusters.length;
        return this.showComplete();
      }
      if (this.charIndex >= this.clusters.length) return this.showComplete();
      const ch = this.clusters[this.charIndex];
      const letter = this.letters[this.charIndex];
      if (letter) letter.classList.add('is-revealed');
      this.charIndex += 1;
      let delay = 28 + ((this.charIndex * 17 + this.index * 7) % 12);
      if (ch === ' ') delay = 18;
      if (',;:'.includes(ch)) delay += 75;
      if ('.!?'.includes(ch)) delay += 145;
      if (ch === '…') delay += 170;
      this.schedule(() => this.typeNext(), delay);
    }
    showComplete() {
      for (const node of this.letters) if (node) node.classList.add('is-revealed');
      this.spark.hidden = true;
      this.root.classList.add('is-written');
      const words = this.page.text.trim().split(/\s+/u).length;
      const hold = clamp(1750 + words * 220, 3350, 10200);
      // Deliberate reading time AFTER the final character, not only during typing.
      this.schedule(() => {
        this.root.classList.remove('is-visible');
        this.schedule(() => this.advance(), this.page?.pause ?? 800);
      }, hold);
    }
    updateStage(now) {
      if (!this.lavender?.baseSceneView || !this.lavender?.applyIdleDrift) return;
      if (!this.stageStartedAt) this.stageStartedAt = now;
      const progress = reducedMotion ? 1 : clamp((now - this.stageStartedAt) / 1850, 0, 1);
      const easing = progress * progress * (3 - 2 * progress);
      this.lavender.baseSceneView.centerX = this.stageFromX + (this.stageTargetX - this.stageFromX) * easing;
      const slowBreathFloat = reducedMotion ? 0 : Math.sin((now + this.ambientPhase) / 2300) * .0023;
      const driftX = reducedMotion ? 0 : Math.sin((now + this.ambientPhase) / 3600) * .0017;
      this.lavender.applyIdleDrift(driftX, .012 + slowBreathFloat);
    }
    positionTick(now) {
      if (this.destroyed || this.ended) return;
      this.positionRaf = requestAnimationFrame((time) => this.positionTick(time));
      if (now - this.lastRenderAt >= 65 && !document.hidden) {
        this.lastRenderAt = now;
        this.updateStage(now);
      }
      if (now - this.lastPositionAt < 110 || !this.page || document.hidden) return;
      this.lastPositionAt = now;
      this.place();
    }
    onResize() {
      if (this.started) {
        const target = this.targetCenterX();
        if (target !== this.stageTargetX) {
          this.stageFromX = this.lavender?.baseSceneView?.centerX ?? this.initialCenterX;
          this.stageTargetX = target;
          this.stageStartedAt = nowMs();
        }
      }
      if (!this.page) return;
      const vw = window.innerWidth;
      const length = this.page.text.length;
      const idealWidth = length < 45 ? 177 : length < 80 ? 205 : length < 125 ? 235 : 265;
      const room = vw <= 640 ? Math.floor(vw * .81) - 68 : 320;
      const width = clamp(idealWidth, 156, Math.min(vw - 28, room, vw <= 640 ? 265 : 305));
      this.root.style.width = width + 'px';
      this.bubbleSize.width = width;
      this.bubbleSize.height = this.root.offsetHeight || 0;
      this.place();
    }
    place() {
      if (!this.page || this.destroyed) return;
      const r = this.actorRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padding = 14;
      const space = 17;
      const bw = this.bubbleSize.width || 220;
      const bh = this.bubbleSize.height || this.root.offsetHeight || 130;
      this.bubbleSize.height = bh;
      const cx = r.left + r.width * .5;
      const cy = r.top + r.height * .5;
      const leftRoom = r.left - padding - space;
      const rightRoom = vw - r.right - padding - space;
      let side, x, y;
      // The preferred visual is a left-side, anchored Lavender speech bubble.
      if (leftRoom >= bw - 9) {
        side = 'left';
        x = r.left - space - bw;
        y = cy - bh * .53;
      } else if (rightRoom >= bw - 9) {
        side = 'right';
        x = r.right + space;
        y = cy - bh * .53;
      } else {
        x = cx - bw * .50;
        const above = r.top - padding - space;
        const below = vh - padding - r.bottom - space;
        if (above >= bh || above >= below) {
          side = 'above'; y = r.top - space - bh;
        } else {
          side = 'below'; y = r.bottom + space;
        }
      }
      x = clamp(x, padding, Math.max(padding, vw - bw - padding));
      y = clamp(y, padding, Math.max(padding, vh - bh - padding));
      const tail = side === 'left' || side === 'right'
        ? clamp(cy - y, 23, Math.max(23, bh - 23))
        : clamp(cx - x, 23, bw - 23);
      if (Math.abs(x - this.lastPosition.x) > .5 ||
          Math.abs(y - this.lastPosition.y) > .5 ||
          side !== this.lastPosition.side) {
        this.root.style.left = x.toFixed(1) + 'px';
        this.root.style.top = y.toFixed(1) + 'px';
        this.root.dataset.side = side;
        this.root.style.setProperty('--lnv-tail-at', tail.toFixed(1) + 'px');
        this.lastPosition = { x, y, side };
      }
    }
    onVisibility() {
      if (this.destroyed) return;
      if (document.hidden) {
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
        this.clearActingTimers();
        this.waitingVisibility = true;
      } else if (this.waitingVisibility) {
        this.waitingVisibility = false;
        if (!this.page) this.schedule(() => this.advance(), 300);
        else if (this.charIndex >= this.clusters.length) this.schedule(() => this.showComplete(), 500);
        else {
          this.root.classList.add('is-visible');
          this.schedule(() => this.typeNext(), 320);
        }
      }
    }
    finish() {
      this.ended = true;
      this.clearActingTimers();
      this.root.classList.remove('is-visible');
      if (this.positionRaf) cancelAnimationFrame(this.positionRaf);
      this.positionRaf = 0;
      this.schedule(() => this.root.remove(), 1000);
      const firstX = this.lavender?.baseSceneView?.centerX ?? this.initialCenterX;
      const begin = nowMs();
      const goHome = (t) => {
        if (this.destroyed) return;
        const k = reducedMotion ? 1 : clamp((t - begin) / 2100, 0, 1);
        const eased = k * k * (3 - 2 * k);
        if (this.lavender?.baseSceneView) this.lavender.baseSceneView.centerX = firstX + (this.initialCenterX - firstX) * eased;
        this.lavender?.applyIdleDrift?.(0, .012);
        if (k < 1) this.returnRaf = requestAnimationFrame(goHome);
        else {
          this.returnRaf = 0;
          this.lavender?.engine?.setState?.('lament');
          this.lavender?.startMelancholicIdle?.(this.residualTargets);
        }
      };
      this.returnRaf = requestAnimationFrame(goHome);
    }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      this.clearActingTimers();
      if (this.positionRaf) cancelAnimationFrame(this.positionRaf);
      if (this.returnRaf) cancelAnimationFrame(this.returnRaf);
      this.positionRaf = 0;
      this.returnRaf = 0;
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
        bubbleSide: this.root.dataset.side,
        actingState: this.currentActing,
        originalMusicLoop: this.music?.track?.loop ?? false,
        scoreReady: Boolean(this.music?.narrativePreviewScore),
        outroStarted: Boolean(this.music?.outroStarted),
        remaining: Math.max(0, PAGES.length - this.index),
        vocalCuesPlayed: this.vocals.cuesPlayed,
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
    const { lavender, audio, music, getResidualTargets } = event.detail ?? {};
    if (!lavender?.engine) {
      console.warn('[Chispa][Lavender] No se encontró el renderizador canónico al llegar al reposo.');
      return;
    }
    director = new LavenderDialogueDirector({ lavender, audio, music, getResidualTargets });
    director.start();
    console.info('[Chispa][Lavender] Narración automática iniciada.', PAGES.length, 'burbujas');
  };

  window.addEventListener('chispa:cosmic-idle', onCosmicIdle, { once: true });
  window.__chispaNarrativePreview = Object.freeze({
    getStatus: () => director?.getStatus() ?? Object.freeze({ state: 'waiting-for-cosmic-idle', total: PAGES.length }),
  });
})();
