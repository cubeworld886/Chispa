# Chispa rendering performance implementation plan

> For agentic workers: execute this approved iteration using executing-plans and test-driven-development. Check each task after its RED/GREEN evidence.

Goal: preserve the canonical actor, narrative, soundtrack and cinematic timing while eliminating duplicate rendering and unnecessary background work.
Architecture: one cooperative frame scheduler with opt-in diagnostics, per-subsystem cadence, explicit visibility handling and conservative raster-only adaptation. Keep the canonical pose/geometry assets and public APIs unchanged.
Tech stack: dependency-free browser JavaScript, SVG, Canvas 2D, WebGL2, node:test; optional Playwright browser verification.
Spec: the approved implementation scope in this conversation, recorded in Global Constraints below.

## Global Constraints
- Isolated branch perf/chispa-render-2026-11-16 from fe52c2943c78d0aa006fede378c9f5270e91b55c; never update main or deploy production.
- Do not change geometry data, motion curves, text, audio assets or timeline constants.
- Preserve interactive, live Lavender; no static replacement and no blanket FPS reduction.
- Use existing test injection points. Add runtime tests, not source-string-only checks.
- Diagnose two baseline failures rather than silently suppressing them.

## Review Focus
- High-refresh displays must not bypass Lavender's configured cap through forced renders.
- Hidden tabs, bfcache restoration, disposal and retry must not create duplicate schedulers.
- Long narratives must retain every message and correct music transitions.
- Adaptive raster quality must not oscillate, reduce SVG identity or expand allocation every frame.
- Unchanged attributes and shape inputs must retain exact visible output while avoiding redundant writes.

### Task 1: Cooperative rendering and diagnostics
Files: cosmic/render-coordinator.js; cosmic/test/render-coordinator.test.mjs; index.html; scheduler call sites.
Interfaces: ChispaRenderCoordinator.requestAnimationFrame(callback, {at, label, priority}), cancelAnimationFrame(handle), setTimeout/clearTimeout, now(), getSnapshot(), destroy(); runtime global chispaFrames.
- [x] RED: tests for coalescing, cancellation during dispatch, deferred work, visibility, exception isolation and bounded diagnostics.
- [x] GREEN: implement one native RAF plus one deadline timer, with no global native-method overrides.
- [x] Verify: node --test cosmic/test/render-coordinator.test.mjs (all pass); integrate existing consumers without breaking injectable schedulers.

### Task 2: Single Lavender render owner and SVG work reuse
Files: cosmic/lavender-host.js; cosmic/cosmic-event.js; lavender-runtime/dist/renderer/LavenderSvgEngine.js; new SVG attribute utility; regression tests.
Interfaces: setters update state only; forceVisibleFrame reserved for preflight; render commits attributes only when changed; contour/eye work reuses exact inputs.
- [x] RED: repeated completed reveal must not force rendering; full controller+host reveal remains bounded; repeated identical SVG commits are skipped.
- [x] GREEN: remove reveal forced renders and make completion idempotent; route engine scheduling through shared coordinator; avoid redundant DOM writes and reuse shape/eye contour data.
- [x] Verify targeted tests and full suite; compare canonical SVG output at deterministic poses.

### Task 3: Cosmic lifetime, background and adaptive raster budget
Files: cosmic/constellation-fracture.js; cosmic/cosmic.css; cosmic/bootstrap.js; cosmic/webgl-adapter.js; script.js; cosmic/narrative-preview.js; cosmic/melancholic-idle.js.
Interfaces: scene-state event controls loader/occlusion work; raster budget exposes qualityScale and quality-change notifications.
- [x] RED: low-frequency residuals request delayed frames; hidden loader prevents sky painting; inherited clone animations stop; sustained pressure degrades raster budget and recovery is slower.
- [x] GREEN: defer residual scheduling, freeze inherited shard animation only, suppress fully occluded sky, respect visibility, adapt raster resolution with hysteresis and mobile power preference.
- [x] Verify browser loading, introduction, narration, resize and disposal.

### Task 4: End-to-end verification and branch delivery
Files: docs/PERFORMANCE.md; reproducible browser regression script; scoped test workflow where feasible.
- [x] Resolve stale baseline assertions against the published automatic narrative and existing restrained breathing; do not alter creative behavior to satisfy obsolete tests.
- [x] Run all Node tests, syntax checks, browser smoke, deterministic visual comparison, and before/after render-work measurements.
- [x] Self-review the entire diff; explicitly report unavailable physical iPhone/GPU measurements.
- [x] Publish verified changes to the isolated branch, confirm remote tree and unchanged main.
