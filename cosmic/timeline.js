export const MUSIC_CUE_SECONDS = 7.55;
export const LAVENDER_REVEAL_SECONDS = 5.25;
// Lavender lowers her gaze at reveal+2.35s and begins the drawn-out exhale at
// reveal+2.55s. Place the original sad vocal 0.25s into that exhale.
export const LAVENDER_SAD_CUE_SECONDS = LAVENDER_REVEAL_SECONDS + 2.80;
export const IDLE_SECONDS = 15.20;
export const EXPLOSION_IMPACT_SECONDS = 3.20;

const LAVENDER_PRE_FLASH_START_SECONDS = 2.84;
const LAVENDER_PRE_FLASH_END_SECONDS = 3.08;
const MAIN_FLASH_HALF_WINDOW_SECONDS = 0.10;

export const COSMIC_PHASES = Object.freeze({
  hold: Object.freeze({ name: 'hold', start: 0.00, end: 0.35 }),
  tension: Object.freeze({ name: 'tension', start: 0.35, end: 1.00 }),
  crackSeed: Object.freeze({ name: 'crackSeed', start: 1.00, end: 1.36 }),
  crackPropagation: Object.freeze({ name: 'crackPropagation', start: 1.36, end: 1.86 }),
  shardWaveA: Object.freeze({ name: 'shardWaveA', start: 1.78, end: 2.20 }),
  shardWaveB: Object.freeze({ name: 'shardWaveB', start: 2.12, end: 2.52 }),
  shardWaveC: Object.freeze({ name: 'shardWaveC', start: 2.44, end: 2.84 }),
  singularity: Object.freeze({ name: 'singularity', start: 2.82, end: 3.12 }),
  primaryFlash: Object.freeze({
    name: 'primaryFlash',
    start: EXPLOSION_IMPACT_SECONDS - MAIN_FLASH_HALF_WINDOW_SECONDS,
    end: EXPLOSION_IMPACT_SECONDS + MAIN_FLASH_HALF_WINDOW_SECONDS,
  }),
  bigBang: Object.freeze({ name: 'bigBang', start: EXPLOSION_IMPACT_SECONDS, end: 3.72 }),
  debrisExpansion: Object.freeze({ name: 'debrisExpansion', start: 3.58, end: 5.55 }),
  aftermath: Object.freeze({ name: 'aftermath', start: 5.55, end: 6.15 }),
  lavenderFlash: Object.freeze({
    name: 'lavenderFlash',
    start: LAVENDER_PRE_FLASH_START_SECONDS,
    end: LAVENDER_PRE_FLASH_END_SECONDS,
  }),
  lavenderReveal: Object.freeze({ name: 'lavenderReveal', start: 5.25, end: 6.15 }),
  realization: Object.freeze({ name: 'realization', start: 6.15, end: IDLE_SECONDS }),
  melancholicIdle: Object.freeze({ name: 'melancholicIdle', start: IDLE_SECONDS, end: Infinity }),
});

export const durationUntilIdle = IDLE_SECONDS;

const NARRATIVE_PRECEDENCE = Object.freeze([
  COSMIC_PHASES.lavenderFlash,
  COSMIC_PHASES.primaryFlash,
  COSMIC_PHASES.debrisExpansion,
  COSMIC_PHASES.bigBang,
  COSMIC_PHASES.lavenderReveal,
  COSMIC_PHASES.melancholicIdle,
  COSMIC_PHASES.realization,
  COSMIC_PHASES.aftermath,
  COSMIC_PHASES.singularity,
  COSMIC_PHASES.shardWaveC,
  COSMIC_PHASES.shardWaveB,
  COSMIC_PHASES.shardWaveA,
  COSMIC_PHASES.crackPropagation,
  COSMIC_PHASES.crackSeed,
  COSMIC_PHASES.tension,
  COSMIC_PHASES.hold,
]);

function safeSeconds(inputSeconds) {
  return Number.isFinite(inputSeconds) && inputSeconds >= 0 ? inputSeconds : 0;
}

export function phaseProgress(phase, seconds) {
  if (!phase || !Number.isFinite(seconds) || phase.end === Infinity) return 0;
  const duration = phase.end - phase.start;
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, (seconds - phase.start) / duration));
}

export function progressFor(name, inputSeconds) {
  const phase = COSMIC_PHASES[name];
  if (!phase) return 0;
  const seconds = safeSeconds(inputSeconds);
  if (seconds < phase.start || seconds >= phase.end) return 0;
  if (phase.end === Infinity) return 1;
  return phaseProgress(phase, seconds);
}

export function completedProgressFor(name, inputSeconds) {
  const phase = COSMIC_PHASES[name];
  if (!phase) return 0;
  const seconds = safeSeconds(inputSeconds);
  if (seconds < phase.start) return 0;
  if (phase.end === Infinity || seconds >= phase.end) return 1;
  return phaseProgress(phase, seconds);
}

export function samplePhaseWindows(inputSeconds) {
  const windows = {};
  for (const name of Object.keys(COSMIC_PHASES)) windows[name] = progressFor(name, inputSeconds);
  return Object.freeze(windows);
}

export function phaseAt(inputSeconds) {
  const seconds = safeSeconds(inputSeconds);
  const phase = NARRATIVE_PRECEDENCE.find((candidate) => (
    seconds >= candidate.start && seconds < candidate.end
  )) ?? COSMIC_PHASES.melancholicIdle;

  return Object.freeze({
    ...phase,
    progress: phase.end === Infinity ? 1 : phaseProgress(phase, seconds),
    seconds,
  });
}
