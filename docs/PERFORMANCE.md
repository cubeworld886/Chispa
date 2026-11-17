# Chispa rendering performance iteration

Branch: `perf/chispa-render-2026-11-16`.
Baseline: `fe52c2943c78d0aa006fede378c9f5270e91b55c`.

## What changed

- One cooperative frame scheduler coordinates the cinematic controller, Lavender,
  background canvas, narrative positioning and residual fragments. Low-frequency
  subscribers sleep until their next deadline instead of polling every refresh.
- Lavender's reveal only updates state. The actor loop is the normal render owner;
  forced renders remain available for preparation, not every cinematic frame.
- Identical SVG attributes are not rewritten. A bounded, exact-coordinate path
  cache avoids reserializing identical contours and masks. No shape quantization.
- Fragment clones no longer inherit 63 infinite CSS animation instances from the
  original constellation. They keep the authored trajectories and a static glow.
- The sky sleeps behind the opaque loader and when the document is hidden.
  Its existing moving stars and meteors remain visible after entering.
- Optional raster adaptation changes only Canvas/WebGL resolution (1, .85, .7),
  with sustained-pressure windows and slower recovery. SVG geometry is unaffected.
  The lightweight WebGL profile requests low power instead of high performance.
- Visual scheduling suspends on visibility loss and resumes without duplicate
  consumers. Persisted pagehide preserves the narrative for bfcache restoration.
- Entry-point cache versions were advanced to avoid combining old and new code.

## Preservation and deliberate differences

Canonical geometry files, pose/motion curves, materials, audio files, story text,
acting tables and cinematic timeline constants were not edited. Lavender remains
live SVG, not a video, sprite or static image. Existing actor FPS limits were not
lowered. The duplicate route that bypassed those limits was removed.

The intended visual differences are frozen twinkle on cloned fragments and,
only under sustained load, lower raster resolution for background effects.
A deterministic comparison found **56/56 exactly equal SVG attribute trees**
across seven states, four timestamps and both cinematic-lock modes. This tests
geometry/material output, not every possible screen capture or browser engine.

## Verification

All Node tests run without npm dependencies:

```sh
node --test cosmic/test/*.test.mjs lavender-runtime/test/*.test.mjs
node --check script.js
find cosmic lavender-runtime/dist -name '*.js' -exec node --check {} \;
git diff --check
```

The baseline had 50 tests: 48 passed and two were already failing. The obsolete
opt-in-only narrative assertion and an absolute breathing-amplitude assertion
were corrected to reflect the already-published automatic story and relative
breathing. Production story/motion were not changed to satisfy those tests.
The iteration has **75 passing tests**, including reveal budgets, scheduling,
visibility, deadlines, cache invalidation, full 62-bubble completion and audio
transitions. New behavioral regression tests were observed failing before fixes.

The branch includes a read-only GitHub Actions regression workflow. No deployment
or change to `main` is part of this iteration.

## Reproduce browser checks

Optional requirements: Python, `playwright`, and installed Chromium. The checked
environment used Playwright 1.57.0 and Chromium 144.0.7559.96 on Linux.

Prepare a separate checkout of the baseline, then run:

```sh
python tools/verify-lavender-identity.py --before /path/to/baseline --output /tmp/identity.json
python tools/measure-performance.py --root /path/to/baseline --output /tmp/baseline-mobile.json
python tools/measure-performance.py --output /tmp/optimized-mobile.json
python tools/measure-performance.py --desktop --output /tmp/optimized-desktop.json
```

The harness runs real page code in Chromium, fulfills resources from local files,
uses an in-memory storage stub, and instruments render/attribute calls. Every
external request is intercepted. The lightweight viewport is 390x844, DPR 3,
touch enabled; desktop is 1365x900 at DPR 1. WebGL uses SwiftShader. Screenshots
are saved beside each JSON. The harness may produce document.write/parser
warnings from set_content; these are not page exceptions.

Results in `docs/performance/verification.json` are **work counts**, not physical
FPS, GPU timings, thermal readings, battery savings or Safari measurements.
The comparison window is seconds 7 through 10 after the Enter click. Instrumenting
SVG calls adds overhead; before and after use the same instrumentation.

## Optional in-page diagnostics

Open the page with `?perf=1`, then run:

```js
__chispaPerf.snapshot()
```

The snapshot includes queued tasks, callbacks by subsystem, time spent inside
JavaScript callbacks, up to 120 inter-frame samples, raster quality scale and
JavaScript heap size where supported. `frameP95Ms` is a scheduler frame interval,
not a GPU render duration. No telemetry is transmitted or stored remotely.
Diagnostics are disabled by default. Native browser APIs are not monkey-patched
by production code; interception exists only in the measurement harness.

## Review decisions and remaining validation

The author performed a separate full-diff self-review; no independent reviewer
or physical iPhone was available. Review caught and fixed excess timer delay for
timers created while hidden, mid-dispatch suspension, and bfcache narrative loss.
There are no known deferred critical/important code findings from that review.

Exact geometry equality was chosen instead of perceptual contour quantization:
this preserves close-up identity but yields fewer cache hits while contours move.
The approved implementation was executed without another confirmation gate.
Skill bookkeeping was maintained locally because helper scripts were unavailable.
Quality recovery is validated over complete sampling windows, not partial ones.

Before merging, verify the entire experience on the affected real device,
especially iPhone/Safari, orientation changes, interruptions and prolonged
playback. Browser viewport emulation does not prove thermals or absence of
OS-triggered memory reloads. This branch is delivered for review, not merged or
deployed automatically. No claim of guaranteed physical-device 30/60 FPS is made.
