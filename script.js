const stars = [
  { groupId: 'vega-group', boxId: 'vega-info' },
  { groupId: 'zeta-group', boxId: 'zeta-info' },
  { groupId: 'sheliak-group', boxId: 'sheliak-info' },
  { groupId: 'sulafat-group', boxId: 'sulafat-info' },
  { groupId: 'delta-group', boxId: 'delta-info' },
  { groupId: 'eos-group', boxId: 'eos-info' }
];

// --- "Viento" estelar: dirección base con deriva lenta ---
const DEG = Math.PI / 180;
const WIND = {
  base: 225 * DEG,    // 225°: de NE -> SW (natural para tu escena)
  t: 0,               // tiempo para drift senoidal
  drift: 7 * DEG      // deriva angular ±7°
};
function windAngle() {
  return WIND.base + Math.sin(WIND.t) * WIND.drift;
}

const totalVisitables = stars.filter(s => s.groupId !== 'eos-group').length;

let currentBox = null;
let currentGroup = null;
let visitedStars = new Set();

const audio = document.getElementById('bg-music');

stars.forEach(({ groupId, boxId }) => {
  const starGroup = document.getElementById(groupId);
  const infoBox = document.getElementById(boxId);

  if (starGroup && infoBox) {
    starGroup.addEventListener('click', () => {
      // Evitar que Eos se abra si aún no está desbloqueada
      if (groupId === 'eos-group' && !starGroup.classList.contains('unlocked')) return;

      // Cerrar cajas anteriores
      if (currentBox) currentBox.classList.replace('visible', 'hidden');
      if (currentGroup) currentGroup.classList.remove('expanded');

		// Añadir fundido entre estrellas
		document.body.classList.add("transitioning");
		setTimeout(() => document.body.classList.remove("transitioning"), 500);

      // Mostrar nueva info
      starGroup.classList.add('expanded');
      infoBox.classList.replace('hidden', 'visible');
      currentBox = infoBox;
      currentGroup = starGroup;

		// Reiniciar posición del scroll en el contenedor del poema
		const scrollBox = infoBox.querySelector('.poem-container');
		if (scrollBox) scrollBox.scrollTop = 0;

      // Registrar visita si no es Eos
      if (groupId !== 'eos-group') {
        visitedStars.add(groupId);

        if (visitedStars.size === totalVisitables) {
          const eosGroup = document.getElementById("eos-group");
          if (eosGroup) {
            eosGroup.classList.remove("hidden");
            eosGroup.classList.add("unlocked");
            triggerEosAnimation();
          }
        }
      }

      // Animar poema
      const poem = infoBox.querySelector('.poem-container');
      if (poem) {
        poem.classList.remove('visible');
        void poem.offsetWidth;
        poem.classList.add('visible');

			  if (groupId === 'eos-group') {
			    generateTears();
				 animatePoemLines();
			  }
      }


    // Lógica de música
    // 🎵 Lógica musical
      const bg = document.getElementById("bg-music");
      const altair1 = document.getElementById("altair-music");
      const altair2 = document.getElementById("altair-music-2");

      if (groupId === "eos-group") {
        if (bg && !bg.paused) bg.pause();

        if (altair2) {
          altair2.pause();
          altair2.currentTime = 0;
          altair2.loop = false;
        }

        if (altair1) {
          altair1.currentTime = 0;
          altair1.play().catch(() => {});
          altair1.onended = () => {
            if (altair2) {
              altair2.currentTime = 0;
              altair2.loop = true;
              altair2.play().catch(() => {});
            }
          };
        }
      } else {
        const altairActive =
          (altair1 && !altair1.paused) || (altair2 && !altair2.paused);
        if (!altairActive && bg && bg.paused) {
          bg.play().catch(() => {});
        }
      }


    });
  }
});

// Botones de cierre
document.querySelectorAll('.close-info').forEach(button => {
  button.addEventListener('click', () => {
    const box = button.closest('.info-box');
    if (box) {
      box.classList.replace('visible', 'hidden');
      if (currentGroup) currentGroup.classList.remove('expanded');
      currentBox = null;
      currentGroup = null;
    }
  });
});

// Fondo galáctico animado
// ====================== Fondo galáctico animado (blindado) ======================
(() => {
  // --- utilidades "viento" (usa tus constantes si ya las tienes) ---
  const DEG = Math.PI / 180;
  // flujo natural hacia abajo-izquierda en canvas:
  if (typeof window.WIND === "undefined") {
    window.WIND = { base: 135 * DEG, t: 0, drift: 7 * DEG };
  } else {
    WIND.base = 135 * DEG;
    WIND.drift = WIND.drift || 7 * DEG;
    WIND.t = WIND.t || 0;
  }
  const windAngle = () => WIND.base + Math.sin(WIND.t) * WIND.drift;

  // --- asegurar canvas presente y visible ---
  document.addEventListener("DOMContentLoaded", initCanvas);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    // si el script se cargó tarde, inicializa igual
    initCanvas();
  }

  let canvas, ctx, starsArray = [], meteors = [];
  const MAX_METEORS = 6;

  function ensureCanvas() {
    let c = document.getElementById("background");
    if (!c) {
      c = document.createElement("canvas");
      c.id = "background";
      document.body.prepend(c);
    }
    // CSS mínimo para que SIEMPRE sea visible y detrás
    const s = c.style;
    s.position = "fixed";
    s.inset = "0";
    s.zIndex = "0";
    s.display = "block";
    s.opacity = "1";
    return c;
  }

  function initCanvas() {
    canvas = ensureCanvas();
    try {
      ctx = canvas.getContext("2d", { alpha: true });
    } catch (e) {
      console.error("No se pudo obtener 2D context del canvas:", e);
      return;
    }
    resizeCanvas();
    window.addEventListener("resize", () => {
      clearTimeout(resizeCanvas.__t);
      resizeCanvas.__t = setTimeout(resizeCanvas, 120);
    });
    queueNextMeteor();   // arranca spawner
    animate();           // arranca bucle
  }

  // --- tamaño DPR-aware + (re)crear campo de estrellas ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const cssH = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.shadowColor = "transparent";
    createStars();
  }

  function createStars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const count = 300;
    starsArray = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2,
      a: Math.random(),
      pulse: Math.random() * 0.02 + 0.005
    }));
  }

  // --- meteoros con flujo coherente ---
  function spawnMeteor(opts = {}) {
    if (meteors.length >= MAX_METEORS) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const margin = 60;

    const angle = (opts.angle ?? windAngle()) + (Math.random() * 16 - 8) * DEG;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    // bordes barlovento (según dirección)
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
                                      : ["top","right","left","bottom"][Math.floor(Math.random()*4)]);
      switch (edge) {
        case "top":    x = Math.random() * (W * 1.1); y = -margin; break;
        case "right":  x = W + margin; y = Math.random() * (H * 1.1); break;
        case "bottom": x = Math.random() * (W * 1.1); y = H + margin; break;
        case "left":
        default:       x = -margin; y = Math.random() * (H * 1.1); break;
      }
    }

    const speed = 6.5 + Math.random() * 5.5;
    const len   = 90  + Math.random() * 150;
    const diag  = Math.hypot(W, H);
    const life  = Math.max(60, Math.min(120, Math.round((diag * 0.9) / speed)));
    const width = 1.8 + Math.random() * 1.6;
    const hue   = 185 + Math.random() * 30;
    const headGlow = 0.6 + Math.random() * 0.25;

    meteors.push({
      x, y, vx: dirX * speed, vy: dirY * speed,
      len, life, age: 0, alpha: 1, width, hue, headGlow
    });
  }

  // compat con tu código existente
  window.spawnShootingStar = () => spawnMeteor();

  function queueNextMeteor() {
    const t = 900 + Math.random() * 1400;
    setTimeout(() => {
      if (Math.random() < 0.25) {
        const burst = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < burst; i++) spawnMeteor();
      } else {
        spawnMeteor();
      }
      queueNextMeteor();
    }, t);
  }

  function drawBackgroundStars() {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    starsArray.forEach(s => {
      s.a += s.pulse;
      if (s.a >= 1 || s.a <= 0.1) s.pulse *= -1;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });
    ctx.restore();
  }

  function drawMeteors() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.age++;
      const t = m.age / m.life;
      if (t >= 1 || m.x < -100 || m.y > canvas.height + 100) {
        meteors.splice(i, 1);
        continue;
      }
      m.x += m.vx; m.y += m.vy; m.alpha = 1 - t;

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
      head.addColorStop(0, `rgba(255,255,255,${0.95 * m.alpha})`);
      head.addColorStop(1, `hsla(${m.hue},100%,70%,0)`);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();

      if (Math.random() < 0.15) {
        ctx.globalAlpha = 0.35 * m.alpha;
        ctx.fillStyle = `hsla(${m.hue},100%,85%,.35)`;
        ctx.beginPath();
        ctx.arc(m.x + (Math.random() * 8 - 4), m.y + (Math.random() * 8 - 4), 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function animate() {
    WIND.t += 0.002;
    drawBackgroundStars();
    drawMeteors();
    requestAnimationFrame(animate);
  }
})();




// 🌌 Animación de desbloqueo de Eos
function triggerEosAnimation() {
  const overlay = document.getElementById('eos-unlock-effect');
  const eosMusic = document.getElementById('eos-music');

  if (!overlay) return;

  overlay.classList.remove('hidden');
  overlay.classList.add('visible');

  // Apagar música anterior y activar la nueva
  if (audio && !audio.paused) audio.pause();
  if (eosMusic) {
    eosMusic.currentTime = 0;
    eosMusic.volume = 0.6;
    eosMusic.loop = true;
    eosMusic.play().catch(() => {});
  }

  // Extra fugaces
  spawnShootingStar();
  setTimeout(spawnShootingStar, 500);
  setTimeout(spawnShootingStar, 1000);

  // Ocultar overlay
  setTimeout(() => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.classList.add('hidden'), 1000);
  }, 4000);
}

function generateTears() {
  const container = document.querySelector("#eos-info .poem-container");
  if (!container) return;

  // Elimina anteriores si hay
  container.querySelectorAll(".tear").forEach(t => t.remove());

  for (let i = 0; i < 25; i++) {
    const tear = document.createElement("div");
    tear.classList.add("tear");
    tear.style.left = `${Math.random() * 100}%`;
    tear.style.animationDelay = `${Math.random() * 10}s`;
    container.appendChild(tear);
  }
}

function animatePoemLines() {
  const poemContainer = document.querySelector("#eos-info .poem-container");
  if (!poemContainer) return;

  const paragraphs = poemContainer.querySelectorAll("p");
  let globalDelay = 0; // <- acumulador global

  paragraphs.forEach(paragraph => {
    const nodes = Array.from(paragraph.childNodes);
    const newNodes = [];

    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const lines = node.textContent.trim().split("\n");
        lines.forEach(line => {
          if (line.trim() === "") return;
          const span = document.createElement("span");
          span.textContent = line.trim();
          span.style.display = "block";
          span.style.opacity = "0";
          span.style.transform = "translateY(10px)";
          span.style.animation = `lineFade 1.8s ease forwards`;
          span.style.animationDelay = `${globalDelay}s`;
          globalDelay += 2.0; // ← espacio entre líneas animadas
          newNodes.push(span);
        });
      } else if (node.nodeName === "BR") {
        globalDelay += 0.5;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        newNodes.push(node);
      }
    });

    paragraph.innerHTML = "";
    newNodes.forEach(n => paragraph.appendChild(n));
  });
}
