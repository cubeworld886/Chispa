/* ==========================================================================
   CHISPA — Interacción + Fondo
   - Arreglo: SVGs duplicados (en HTML)
   - Arreglo: ahorro de batería (pausa en pestaña oculta + modo móvil)
   - Nueva estrella: Deneb (puente Vega–Altair) + galería + música "Heavenly"
   ========================================================================== */

/* ---------------------- Viento estelar (compartido) ---------------------- */
const DEG = Math.PI / 180;

// Mantén un objeto único (lo usamos en el canvas)
const WIND = window.WIND || {
  base: 225 * DEG,   // dirección base
  t: 0,
  drift: 7 * DEG
};
window.WIND = WIND;

function windAngle() {
  return WIND.base + Math.sin(WIND.t) * WIND.drift;
}

/* ---------------------- Configuración de estrellas ---------------------- */
const EOS_ID = "eos-group";       // Altair (tu estrella desbloqueable)
const DENEB_ID = "deneb-group";   // Nueva estrella (puente)
const LYRA_IDS = ["vega-group", "zeta-group", "sheliak-group", "sulafat-group", "delta-group"];

const STAR_CONFIG = [
  { groupId: "vega-group",    boxId: "vega-info" },
  { groupId: "zeta-group",    boxId: "zeta-info" },
  { groupId: "sheliak-group", boxId: "sheliak-info" },
  { groupId: "sulafat-group", boxId: "sulafat-info" },
  { groupId: "delta-group",   boxId: "delta-info" },
  { groupId: EOS_ID,          boxId: "eos-info" },
  { groupId: DENEB_ID,        boxId: "deneb-info" }
];

/* ---------------------- Estado UI ---------------------- */
let currentBox = null;
let currentGroup = null;
const visitedStars = new Set();

const hintEl = document.getElementById("hint");
let hintShown = false;

/* ---------------------- Audio ---------------------- */
const bgMusic = document.getElementById("bg-music");
const altair1 = document.getElementById("altair-music");
const altair2 = document.getElementById("altair-music-2");
const heavenly = document.getElementById("heavenly-music");

function isPlaying(a) {
  return !!(a && !a.paused && a.currentTime > 0);
}

function safePlay(a, { volume, loop } = {}) {
  if (!a) return;
  if (typeof volume === "number") a.volume = volume;
  if (typeof loop === "boolean") a.loop = loop;
  const p = a.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function stopAndReset(a) {
  if (!a) return;
  a.pause();
  a.currentTime = 0;
}

function playBackgroundIfAllowed() {
  // Reproduce la música de fondo solo si no hay otra activa
  if (!bgMusic) return;
  if (isPlaying(altair1) || isPlaying(altair2) || isPlaying(heavenly)) return;
  if (bgMusic.paused) safePlay(bgMusic, { volume: 0.55, loop: true });
}

function playAltair() {
  if (bgMusic && !bgMusic.paused) bgMusic.pause();
  stopAndReset(heavenly);

  if (altair2) {
    altair2.pause();
    altair2.currentTime = 0;
    altair2.loop = false;
  }

  if (altair1) {
    altair1.currentTime = 0;
    safePlay(altair1, { volume: 0.7, loop: false });
    altair1.onended = () => {
      if (altair2) {
        altair2.currentTime = 0;
        safePlay(altair2, { volume: 0.65, loop: true });
      }
    };
  }
}

function playHeavenly() {
  if (bgMusic && !bgMusic.paused) bgMusic.pause();
  stopAndReset(altair1);
  stopAndReset(altair2);

  if (!heavenly) return;
  heavenly.currentTime = 0;
  // Importante: sin loop para que termine justo con la canción (4:18)
  safePlay(heavenly, { volume: 0.65, loop: false });
}

/* ---------------------- Hint ---------------------- */
function showHintOnce() {
  if (hintShown) return;
  hintShown = true;
  if (hintEl) hintEl.classList.remove("hidden");
}

function setHint(text) {
  if (!hintEl) return;
  hintEl.textContent = text;
  hintEl.classList.remove("hidden");
}

/* ---------------------- Unlocks ---------------------- */
function unlockEosIfReady() {
  const eosGroup = document.getElementById(EOS_ID);
  if (!eosGroup || eosGroup.classList.contains("unlocked")) return;

  const ready = LYRA_IDS.every(id => visitedStars.has(id));
  if (!ready) return;

  eosGroup.classList.remove("hidden");
  eosGroup.classList.add("unlocked");
  triggerEosAnimation();
  setHint("Altair ha despertado. Ahora falta el puente.");
}

function unlockDenebIfReady() {
  const denebGroup = document.getElementById(DENEB_ID);
  if (!denebGroup || denebGroup.classList.contains("unlocked")) return;

  if (!visitedStars.has(EOS_ID)) return;

  denebGroup.classList.remove("hidden");
  denebGroup.classList.add("unlocked");

  const tri = document.getElementById("summer-triangle");
  if (tri) {
    tri.classList.remove("hidden");
    tri.classList.add("visible");
  }

  triggerDenebAnimation();
  setHint("Si acaso vuelves… mira el puente.");
}

/* ---------------------- Animaciones de poema (línea por línea) ---------------------- */
function ensureOriginalPoemHTML(poemContainer) {
  if (!poemContainer) return;
  if (!poemContainer.dataset.originalHtml) {
    poemContainer.dataset.originalHtml = poemContainer.innerHTML;
  } else {
    poemContainer.innerHTML = poemContainer.dataset.originalHtml;
  }
}

function animatePoemLines(poemContainer, opts = {}) {
  if (!poemContainer) return 0;

  const lineGap = typeof opts.lineGap === "number" ? opts.lineGap : 2.0;   // separación entre líneas (segundos)
  const brGap   = typeof opts.brGap === "number" ? opts.brGap : 0.5;      // micro-pauses por <br>
  const dur     = typeof opts.duration === "number" ? opts.duration : 1.8; // duración de animación por línea

  const paragraphs = poemContainer.querySelectorAll("p");
  let globalDelay = 0;

  paragraphs.forEach(paragraph => {
    const nodes = Array.from(paragraph.childNodes);
    const newNodes = [];

    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const lines = node.textContent.split("\n");
        lines.forEach(line => {
          const clean = line.replace(/\s+/g, " ").trim();
          if (!clean) return;

          const span = document.createElement("span");
          span.textContent = clean;
          span.style.display = "block";
          span.style.opacity = "0";
          span.style.transform = "translateY(10px)";
          span.style.animation = `lineFade ${dur}s cubic-bezier(0.22, 1, 0.36, 1) forwards`;
          span.style.animationDelay = `${globalDelay}s`;
          globalDelay += lineGap;
          newNodes.push(span);
        });
      } else if (node.nodeName === "BR") {
        globalDelay += brGap;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        newNodes.push(node);
      }
    });

    paragraph.innerHTML = "";
    newNodes.forEach(n => paragraph.appendChild(n));
  });

  return globalDelay + dur;
}

/* ---------------------- Deneb: poema + galería sincronizados ---------------------- */
let denebTick = null;
let denebActive = false;

function stopDenebSequence() {
  denebActive = false;
  if (denebTick) {
    clearInterval(denebTick);
    denebTick = null;
  }
}

/**
 * Prepara el poema de Deneb para un reveal línea-por-línea.
 * - Divide cada <p> en spans (una línea por <br>)
 * - Devuelve metadatos para poder calcular pausas con sentido
 */
function buildDenebLines(poemContainer) {
  const paragraphs = Array.from(poemContainer.querySelectorAll("p"));
  let sectionIndex = -1;

  const metas = [];
  const lines = [];

  paragraphs.forEach((p) => {
    const isTitle = p.classList.contains("poem-title");
    const isSection = p.classList.contains("section-title");

    if (isSection) sectionIndex += 1;

    const nodes = Array.from(p.childNodes);
    let buf = "";
    const lineTexts = [];

    const flush = () => {
      const t = buf.replace(/\s+/g, " ").trim();
      buf = "";
      if (t) lineTexts.push(t);
    };

    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        buf += node.textContent;
      } else if (node.nodeName === "BR") {
        flush();
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Por si hay <strong>/<em>: lo volvemos texto plano para mantener el ritmo.
        buf += node.textContent;
      }
    });
    flush();

    p.innerHTML = "";

    lineTexts.forEach((txt) => {
      const span = document.createElement("span");
      span.classList.add("reveal-line");
      if (isTitle) span.classList.add("reveal-line--title");
      if (isSection) span.classList.add("reveal-line--section");
      span.textContent = txt;
      p.appendChild(span);

      metas.push({
        el: span,
        text: txt,
        sectionIndex,
        isTitle,
        isSection,
        isLastInParagraph: false,
        isLastInSection: false
      });

      lines.push(span);
    });

    // Marca fin de párrafo (sirve para dar “respiración”)
    if (metas.length && lineTexts.length) {
      metas[metas.length - 1].isLastInParagraph = true;
    }
  });

  // Marca fin de sección (cuando cambia el índice de sección)
  for (let i = 0; i < metas.length - 1; i++) {
    if (metas[i].sectionIndex >= 0 && metas[i].sectionIndex !== metas[i + 1].sectionIndex) {
      metas[i].isLastInSection = true;
    }
  }
  if (metas.length) {
    const last = metas[metas.length - 1];
    if (last.sectionIndex >= 0) last.isLastInSection = true;
  }

  return { metas, lines };
}

function computeDenebTimeline(metas, { targetSeconds = 258, fadeSeconds = 1.65, startOffset = 0.8 } = {}) {
  // Pausas extra en líneas “clave” (por significado)
  const specials = new Map([
    ["No fue un milagro.", 0.9],
    ["Fue un sonido.", 0.8],
    ["Me fui de mí.", 1.1],
    ["Eso es peor.", 1.0],
    ["Yo fui una decisión.", 1.3],
    ["adiós…", 1.5]
  ]);

  const weights = [];

  for (let i = 0; i < metas.length - 1; i++) {
    const m = metas[i];
    const next = metas[i + 1];

    let w = 1.0;

    if (m.isTitle) w = 3.0;
    else if (m.isSection) w = 2.4;

    const t = m.text.trim();
    const len = t.length;

    // Pausa natural en frases cortas
    if (len <= 14) w += 0.9;
    else if (len <= 24) w += 0.45;

    // Pausas por puntuación
    if (/:$/.test(t)) w += 0.9;
    if (/…$|\.\.\.$/.test(t)) w += 0.7;

    // Respiraciones estructurales
    if (m.isLastInParagraph) w += 0.6;
    if (m.isLastInSection) w += 0.9;

    const extra = specials.get(t);
    if (extra) w += extra;

    // Pausa antes de un nuevo acto / sección
    if (next && next.isSection) w += 0.45;

    weights.push(w);
  }

  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  const available = Math.max(0, targetSeconds - fadeSeconds - startOffset);
  const scale = available / sumW;

  const times = [];
  let acc = startOffset;
  times.push(acc);

  for (let i = 0; i < weights.length; i++) {
    acc += weights[i] * scale;
    times.push(acc);
  }

  // Tiempos de inicio de cada sección (para que las fotos aparezcan por estrofas)
  const sectionStarts = [];
  metas.forEach((m, idx) => {
    if (m.isSection) sectionStarts[m.sectionIndex] = times[idx];
  });

  return { times, sectionStarts };
}

/**
 * Arranca la experiencia Deneb:
 * - Poema se revela con pausas por sentido
 * - Fotos aparecen por secciones (I..X), no solo por tiempo lineal
 * - Todo se alinea al tiempo de la canción (4:18)
 */
function startDenebSequence(poemContainer, audioEl) {
  if (!poemContainer) return;

  stopDenebSequence();
  ensureOriginalPoemHTML(poemContainer);

  const { metas, lines } = buildDenebLines(poemContainer);
  lines.forEach(l => l.classList.remove("is-visible"));

  let targetSeconds = Number(poemContainer.dataset.target) || 258;
  if (audioEl && isFinite(audioEl.duration) && audioEl.duration > 1) {
    targetSeconds = audioEl.duration;
  }
  const fadeSeconds = 1.65;

  const { times: lineTimes, sectionStarts } = computeDenebTimeline(metas, { targetSeconds, fadeSeconds });

  // Galería (10 imágenes)
  const galleryId = poemContainer.dataset.gallery;
  const gallery = galleryId ? document.getElementById(galleryId) : null;
  const items = gallery ? Array.from(gallery.querySelectorAll(".gallery-item")) : [];
  items.forEach(it => it.classList.remove("is-visible"));

  // Sincroniza imágenes con inicio de cada sección (un poco después del título de la sección)
  const imageTimes = sectionStarts
    .filter(t => typeof t === "number")
    .map(t => t + 1.05);

  denebActive = true;
  let nextLine = 0;
  let nextImg = 0;

  const startedAt = performance.now();
  let preferAudio = !!audioEl;

  const timeNow = () => {
    // Queremos estar “pegados” a la canción. Aunque esté en pausa al principio,
    // currentTime sirve para esperar a que realmente arranque.
    if (preferAudio && audioEl && isFinite(audioEl.currentTime)) {
      // Fallback: si por políticas del navegador la canción no arranca, no dejamos el poema en blanco.
      if (audioEl.currentTime < 0.02 && (performance.now() - startedAt) > 1800) {
        preferAudio = false;
      } else {
        return audioEl.currentTime;
      }
    }
    return (performance.now() - startedAt) / 1000;
  };

  // Menos gasto que requestAnimationFrame: aquí solo necesitamos precisión “humana”.
  denebTick = setInterval(() => {
    if (!denebActive) return;

    const t = timeNow();

    while (nextLine < lines.length && t >= lineTimes[nextLine]) {
      lines[nextLine].classList.add("is-visible");
      nextLine += 1;
    }

    while (nextImg < items.length && nextImg < imageTimes.length && t >= imageTimes[nextImg]) {
      items[nextImg].classList.add("is-visible");
      nextImg += 1;
    }

    if (nextLine >= lines.length && nextImg >= Math.min(items.length, imageTimes.length)) {
      stopDenebSequence();
    }
  }, 80);

  // Seguridad: si la canción termina y por alguna razón faltó algo, lo mostramos.
  if (audioEl) {
    audioEl.addEventListener("ended", () => {
      lines.forEach(l => l.classList.add("is-visible"));
      items.forEach(it => it.classList.add("is-visible"));
    }, { once: true });
  }
}

/* ---------------------- Apertura/cierre de cajas ---------------------- */
function closeCurrentBox() {
  if (currentBox) currentBox.classList.replace("visible", "hidden");
  if (currentGroup) currentGroup.classList.remove("expanded");
  currentBox = null;
  currentGroup = null;
}

function softTransition() {
  document.body.classList.add("transitioning");
  setTimeout(() => document.body.classList.remove("transitioning"), 500);
}

function openStar(groupId, boxId) {
  const starGroup = document.getElementById(groupId);
  const infoBox = document.getElementById(boxId);
  if (!starGroup || !infoBox) return;

  // Bloqueos
  if (groupId === EOS_ID && !starGroup.classList.contains("unlocked")) return;
  if (groupId === DENEB_ID && !starGroup.classList.contains("unlocked")) return;


  // Si vienes de Deneb, corta su secuencia y su audio para que no se queden corriendo en segundo plano
  const leavingDeneb = currentBox && currentBox.id === "deneb-info" && boxId !== "deneb-info";
  if (leavingDeneb) {
    stopDenebSequence();
    stopAndReset(heavenly);
  }

  showHintOnce();
  softTransition();

  // Cerrar anterior
  if (currentBox && currentBox !== infoBox) currentBox.classList.replace("visible", "hidden");
  if (currentGroup && currentGroup !== starGroup) currentGroup.classList.remove("expanded");

  // Abrir
  starGroup.classList.add("expanded");
  infoBox.classList.replace("hidden", "visible");
  currentBox = infoBox;
  currentGroup = starGroup;

  // Scroll al inicio
  const scrollBox = infoBox.querySelector(".poem-container");
  if (scrollBox) scrollBox.scrollTop = 0;

  // Animación base del contenedor
  const poem = infoBox.querySelector(".poem-container");
  if (poem) {
    poem.classList.remove("visible");
    void poem.offsetWidth;
    poem.classList.add("visible");
  }

  // Registrar visita
  visitedStars.add(groupId);

  // Unlocks encadenados
  if (LYRA_IDS.includes(groupId)) unlockEosIfReady();
  if (groupId === EOS_ID) unlockDenebIfReady();

  // Música por estrella
  if (groupId === EOS_ID) {
    playAltair();
  } else if (groupId === DENEB_ID) {
    playHeavenly();
  } else {
    playBackgroundIfAllowed();
  }

  // Animación lenta (Altair + Deneb)
  if (groupId === EOS_ID && poem) {
    ensureOriginalPoemHTML(poem);
    generateTears("#eos-info .poem-container");
    animatePoemLines(poem, { lineGap: 2.0, brGap: 0.55, duration: 1.8 });
  }

  if (groupId === DENEB_ID && poem) {
    startDenebSequence(poem, heavenly);
  }
}

/* ---------------------- Listeners ---------------------- */
STAR_CONFIG.forEach(({ groupId, boxId }) => {
  const starGroup = document.getElementById(groupId);
  if (!starGroup) return;
  starGroup.addEventListener("click", () => openStar(groupId, boxId));
});

// Botones de cierre
document.querySelectorAll(".close-info").forEach(btn => {
  btn.addEventListener("click", () => {
    const box = btn.closest(".info-box");
    const closingDeneb = box && box.id === "deneb-info";

    closeCurrentBox();

    // Si cierras Deneb, vuelve a la música de fondo (si no estás en Altair)
    if (closingDeneb) {
      stopDenebSequence();
      stopAndReset(heavenly);
      playBackgroundIfAllowed();
    }
  });
});

/* ==========================================================================
   Fondo galáctico animado (mejorado + ahorro de batería)
   ========================================================================== */
(() => {
  let canvas, ctx;
  let starsArray = [];
  let meteors = [];
  const MAX_METEORS = 6;

  // Preferencias: batería / movimiento
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobileLike = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || window.innerWidth < 700;
  const lowPowerMode = prefersReducedMotion || isMobileLike;

  // Para pausar/reanudar de verdad
  let rafId = null;
  let meteorTimer = null;

  function getDpr() {
    const cap = lowPowerMode ? 1.5 : 2;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  function ensureCanvas() {
    const c = document.getElementById("background");
    if (!c) return null;
    c.style.display = "block";
    c.style.opacity = "1";
    return c;
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = getDpr();
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    createStars();
  }

  function createStars() {
    const dpr = getDpr();
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    // Densidad adaptativa (ahorra batería en pantallas pequeñas)
    const area = W * H;
    const base = lowPowerMode ? 160 : 260;
    const max = lowPowerMode ? 220 : 340;
    const count = Math.max(base, Math.min(max, Math.round(area / (lowPowerMode ? 2600 : 2200))));

    starsArray = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * (lowPowerMode ? 1.0 : 1.25),
      a: Math.random(),
      pulse: Math.random() * (lowPowerMode ? 0.014 : 0.02) + (lowPowerMode ? 0.004 : 0.006)
    }));
  }

  function spawnMeteor(opts = {}) {
    if (meteors.length >= MAX_METEORS || !ctx) return;

    const dpr = getDpr();
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const margin = 60;

    const angle = (opts.angle ?? windAngle()) + (Math.random() * 16 - 8) * DEG;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    // bordes barlovento
    const candidates = [];
    if (dirY > 0) candidates.push("top");
    if (dirX < 0) candidates.push("right");
    const useCorner = (candidates.length === 2) && Math.random() < 0.7;

    let x, y;
    if (useCorner) {
      x = W + margin - Math.random() * (W * 0.25);
      y = -margin + Math.random() * (H * 0.25);
    } else {
      const edge = (candidates.length ? candidates[Math.floor(Math.random() * candidates.length)]
                                      : ["top","right","left","bottom"][Math.floor(Math.random() * 4)]);
      switch (edge) {
        case "top":    x = Math.random() * (W * 1.1); y = -margin; break;
        case "right":  x = W + margin; y = Math.random() * (H * 1.1); break;
        case "bottom": x = Math.random() * (W * 1.1); y = H + margin; break;
        case "left":
        default:       x = -margin; y = Math.random() * (H * 1.1); break;
      }
    }

    const speed = (lowPowerMode ? 5.8 : 6.5) + Math.random() * (lowPowerMode ? 4.2 : 5.5);
    const len   = 90 + Math.random() * 150;
    const diag  = Math.hypot(W, H);
    const life  = Math.max(60, Math.min(120, Math.round((diag * 0.9) / speed)));
    const width = 1.6 + Math.random() * 1.6;
    const hue   = 185 + Math.random() * 30;
    const headGlow = 0.55 + Math.random() * 0.25;

    meteors.push({
      x, y,
      vx: dirX * speed,
      vy: dirY * speed,
      len, life,
      age: 0,
      alpha: 1,
      width,
      hue,
      headGlow
    });
  }

  // Compat: lo usa tu unlock de Eos
  window.spawnShootingStar = () => spawnMeteor();

  function scheduleNextMeteor() {
    if (meteorTimer) clearTimeout(meteorTimer);
    if (document.hidden) return;

    const base = lowPowerMode ? 1200 : 900;
    const spread = lowPowerMode ? 1800 : 1400;
    const t = base + Math.random() * spread;

    meteorTimer = setTimeout(() => {
      if (document.hidden) return;

      if (Math.random() < 0.25) {
        const burst = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < burst; i++) spawnMeteor();
      } else {
        spawnMeteor();
      }
      scheduleNextMeteor();
    }, t);
  }

  function drawBackgroundStars(dtFactor) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    starsArray.forEach(s => {
      s.a += s.pulse * dtFactor;
      if (s.a >= 1 || s.a <= 0.1) s.pulse *= -1;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });

    ctx.restore();
  }

  function drawMeteors(dtFactor) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.age += dtFactor;
      const t = m.age / m.life;

      // Fuera de pantalla / terminó
      if (t >= 1 || m.x < -120 || m.y > (canvas.height + 120)) {
        meteors.splice(i, 1);
        continue;
      }

      m.x += m.vx * dtFactor;
      m.y += m.vy * dtFactor;
      m.alpha = 1 - t;

      const vMag = Math.hypot(m.vx, m.vy) || 1;
      const tx = m.x - (m.vx / vMag) * m.len;
      const ty = m.y - (m.vy / vMag) * m.len;

      const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, `hsla(${m.hue},100%,92%,${0.85 * m.alpha})`);
      grad.addColorStop(0.25, `hsla(${m.hue},100%,80%,${0.55 * m.alpha})`);
      grad.addColorStop(1, `hsla(${m.hue},100%,60%,0)`);

      ctx.lineWidth = m.width;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 8);
      head.addColorStop(0, `hsla(${m.hue},100%,95%,${m.headGlow * m.alpha})`);
      head.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Loop con pausa real cuando la pestaña no está visible
  let last = 0;
  function tick(now) {
    rafId = requestAnimationFrame(tick);
    if (document.hidden) return;

    const dt = Math.min(34, now - last || 16.7); // clamp (ms)
    last = now;
    const dtFactor = dt / 16.7;

    WIND.t += 0.002 * dtFactor;

    drawBackgroundStars(dtFactor);
    drawMeteors(dtFactor);
  }

  function start() {
    if (!canvas || !ctx) return;
    if (rafId === null) rafId = requestAnimationFrame(tick);
    scheduleNextMeteor();
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (meteorTimer) {
      clearTimeout(meteorTimer);
      meteorTimer = null;
    }
  }

  function initCanvas() {
    canvas = ensureCanvas();
    if (!canvas) return;

    try {
      ctx = canvas.getContext("2d", { alpha: true });
    } catch (e) {
      console.error("No se pudo obtener 2D context del canvas:", e);
      return;
    }

    resizeCanvas();

    // Resize con debounce
    window.addEventListener("resize", () => {
      clearTimeout(resizeCanvas.__t);
      resizeCanvas.__t = setTimeout(resizeCanvas, 120);
    });

    // Pausar/reanudar por visibilidad (batería)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else {
        resizeCanvas();
        start();
      }
    });

    start();
  }

  document.addEventListener("DOMContentLoaded", initCanvas);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initCanvas();
  }
})();

/* ==========================================================================
   Unlock overlays
   ========================================================================== */
function triggerEosAnimation() {
  const overlay = document.getElementById("eos-unlock-effect");
  if (!overlay) return;

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");

  // Extra fugaces
  if (typeof window.spawnShootingStar === "function") {
    window.spawnShootingStar();
    setTimeout(window.spawnShootingStar, 500);
    setTimeout(window.spawnShootingStar, 1000);
  }

  setTimeout(() => {
    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 900);
  }, 3500);
}

function triggerDenebAnimation() {
  const overlay = document.getElementById("deneb-unlock-effect");
  if (!overlay) return;

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");

  // Una fugaz suave
  if (typeof window.spawnShootingStar === "function") {
    setTimeout(window.spawnShootingStar, 450);
  }

  setTimeout(() => {
    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 900);
  }, 3200);
}

/* ==========================================================================
   Efectos (Altair)
   ========================================================================== */
function generateTears(selector) {
  const container = document.querySelector(selector || "#eos-info .poem-container");
  if (!container) return;

  // Elimina anteriores
  container.querySelectorAll(".tear").forEach(t => t.remove());

  for (let i = 0; i < 22; i++) {
    const tear = document.createElement("div");
    tear.classList.add("tear");
    tear.style.left = `${Math.random() * 100}%`;
    tear.style.animationDelay = `${Math.random() * 10}s`;
    container.appendChild(tear);
  }
}
