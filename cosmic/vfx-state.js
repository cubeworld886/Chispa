const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const clean = (value) => Math.round(value * 1000) / 1000;

function activeWindow(windows, name, phase, progress) {
  const value = windows?.[name];
  if (Number.isFinite(value)) return clamp01(value);
  return phase === name ? clamp01(progress) : 0;
}

export function deriveVfxState({ phase = 'hold', progress = 0, windows = {} } = {}) {
  const singularity = activeWindow(windows, 'singularity', phase, progress);
  const primaryFlash = activeWindow(windows, 'primaryFlash', phase, progress);
  const bigBang = activeWindow(windows, 'bigBang', phase, progress);
  const debris = activeWindow(windows, 'debrisExpansion', phase, progress);
  const aftermath = activeWindow(windows, 'aftermath', phase, progress);
  const lavenderFlash = activeWindow(windows, 'lavenderFlash', phase, progress);
  const lavenderReveal = activeWindow(windows, 'lavenderReveal', phase, progress);
  const realization = activeWindow(windows, 'realization', phase, progress);
  const idle = activeWindow(windows, 'melancholicIdle', phase, progress);

  let explosion = 0;
  if (debris > 0) {
    explosion = 2.7;
  } else if (aftermath > 0 || lavenderFlash > 0 || lavenderReveal > 0 || realization > 0 || idle > 0) {
    explosion = 2.7;
  } else if (bigBang > 0) {
    explosion = bigBang * 2.7;
  }

  let fade = 1;
  if (debris > 0) {
    fade = 1 - debris;
  } else if (aftermath > 0 || lavenderFlash > 0 || lavenderReveal > 0 || realization > 0 || idle > 0) {
    fade = 0;
  }

  let singularityEnergy = 0;
  if (primaryFlash > 0) singularityEnergy = 1;
  else if (bigBang > 0) singularityEnergy = 1 - bigBang;
  else if (singularity > 0) singularityEnergy = singularity;

  let shockwave = 0;
  let shockwaveStrength = 0;
  if (debris > 0) {
    shockwave = 0.95 + debris * 0.15;
    shockwaveStrength = (1 - debris) * 0.006;
  } else if (bigBang > 0) {
    shockwave = bigBang * 0.95;
    shockwaveStrength = (1 - bigBang) * 0.022;
  }

  const bloomBoost = primaryFlash > 0
    ? 1.5
    : lavenderFlash > 0
      ? 1 + lavenderFlash * 0.75
      : 1;

  return Object.freeze({
    explosion: clean(explosion),
    fade: clean(clamp01(fade)),
    singularityEnergy: clean(clamp01(singularityEnergy)),
    shockwave: clean(shockwave),
    shockwaveStrength: clean(Math.max(0, shockwaveStrength)),
    bloomBoost: clean(bloomBoost),
  });
}
