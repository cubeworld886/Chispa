const stars = [
  { groupId: 'vega-group', boxId: 'vega-info' },
  { groupId: 'zeta-group', boxId: 'zeta-info' },
  { groupId: 'sheliak-group', boxId: 'sheliak-info' },
  { groupId: 'sulafat-group', boxId: 'sulafat-info' },
  { groupId: 'delta-group', boxId: 'delta-info' },
  { groupId: 'eos-group', boxId: 'eos-info' }
];

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
const canvas = document.getElementById("background");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let starsArray = [], shootingStars = [];

function createStars() {
  starsArray = [];
  for (let i = 0; i < 300; i++) {
    starsArray.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.2,
      alpha: Math.random(),
      speed: Math.random() * 0.2,
      pulse: Math.random() * 0.02 + 0.005
    });
  }
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  starsArray.forEach(star => {
    star.alpha += star.pulse;
    if (star.alpha >= 1 || star.alpha <= 0.1) star.pulse *= -1;
    ctx.globalAlpha = star.alpha;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
  });

  shootingStars.forEach((s, i) => {
    ctx.globalAlpha = s.alpha;
    let gradient = ctx.createLinearGradient(s.x, s.y, s.x - s.length, s.y + s.length);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, "transparent");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.length, s.y + s.length);
    ctx.stroke();

    s.x += s.vx;
    s.y += s.vy;
    s.alpha -= 0.01;
    if (s.alpha <= 0) shootingStars.splice(i, 1);
  });
}

function spawnShootingStar() {
  const amount = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < amount; i++) {
    shootingStars.push({
      x: Math.random() * canvas.width,
      y: 0,
      vx: -6 - Math.random() * 3,
      vy: 6 + Math.random() * 3,
      alpha: 1,
      length: 60 + Math.random() * 100
    });
  }
}

function animate() {
  drawStars();
  requestAnimationFrame(animate);
}

createStars();
animate();
setInterval(spawnShootingStar, 1400 + Math.random() * 1000);

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  createStars();
});

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
