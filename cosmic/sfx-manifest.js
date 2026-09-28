import { COSMIC_PHASES, EXPLOSION_IMPACT_SECONDS, LAVENDER_SAD_CUE_SECONDS } from './timeline.js?prepdiag=20260928l';

export function createCosmicSfxManifest(siteRoot) {
  const asset = (file) => new URL(`assets/cosmic/sfx/${file}`, siteRoot).href;
  return [
    {
      id: 'fracture-crack',
      url: asset('constellation-glass-shatter.mp3'),
      at: COSMIC_PHASES.crackSeed.start,
      gain: 0.30,
      fadeIn: 0.008,
      // Let the full 4.032 s recording carry the crack through the later shard fall.
    },
    {
      id: 'primary-explosion',
      url: asset('exploding-building-2.mp3'),
      at: EXPLOSION_IMPACT_SECONDS,
      gain: 0.38,
      fadeIn: 0.006,
      duration: 4.2,
      fadeOut: 0.85,
    },
    {
      id: 'fragment-fall',
      url: asset('rocks-gravel-slide.mp3'),
      at: COSMIC_PHASES.debrisExpansion.start,
      gain: 0.28,
      fadeIn: 0.025,
      duration: 1.95,
      fadeOut: 0.45,
    },
    {
      id: 'lavender-sad',
      url: asset('lavender-sad.wav'),
      at: LAVENDER_SAD_CUE_SECONDS,
      gain: 0.40,
      fadeIn: 0.045,
      source: 'Original Lyra POS Lavender sad voice cue, LavenderAudioDirector.ts',
      sourceUrl: 'local: C:\\Aplicaciones_Lyra_Lavender\\Lyra_Web_v2_Lavender_Production_C11_WIP43_POS_RUNTIME_LIVE_SWITCH\\public\\assets\\sfx\\lavender_sad.wav',
      license: 'Internal project asset; no public license; use authorized by user',
    },
  ];
}


