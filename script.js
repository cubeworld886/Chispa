const stars = [
  { groupId: 'vega-group', boxId: 'vega-info' },
  { groupId: 'zeta-group', boxId: 'zeta-info' },
  { groupId: 'sheliak-group', boxId: 'sheliak-info' },
  { groupId: 'sulafat-group', boxId: 'sulafat-info' },
  { groupId: 'delta-group', boxId: 'delta-info' }
];

const audio = document.getElementById('bg-music');
let currentBox = null;
let currentGroup = null;

// Asignar evento a cada estrella
stars.forEach(({ groupId, boxId }) => {
  const starGroup = document.getElementById(groupId);
  const infoBox = document.getElementById(boxId);

  if (starGroup && infoBox) {
    starGroup.addEventListener('click', () => {
      // Cierra caja abierta
      if (currentBox) {
        currentBox.classList.remove('visible');
        currentBox.classList.add('hidden');
      }
      if (currentGroup) {
        currentGroup.classList.remove('expanded');
      }

      // Muestra la nueva
      starGroup.classList.add('expanded');
      infoBox.classList.remove('hidden');
      infoBox.classList.add('visible');
      currentBox = infoBox;
      currentGroup = starGroup;

      // Activa animación
      const poem = infoBox.querySelector('.poem-container');
      if (poem) {
        poem.classList.remove('visible'); // reset animación
        void poem.offsetWidth; // reflow
        poem.classList.add('visible');
      }

      // Reproducir música
      if (audio && audio.paused) {
        audio.volume = 0.4;
        audio.loop = true;
        audio.play().catch(() => {});
      }
    });
  }
});

document.querySelectorAll('.close-info').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentBox) {
      currentBox.classList.remove('visible');
      currentBox.classList.add('hidden');
    }
    if (currentGroup) {
      currentGroup.classList.remove('expanded');
    }

    const poem = currentBox?.querySelector('.poem-container');
    if (poem) poem.classList.remove('visible');

    currentBox = null;
    currentGroup = null;
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