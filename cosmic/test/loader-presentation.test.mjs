import assert from 'node:assert/strict';
import test from 'node:test';
import { installProductionCosmicBootstrap } from '../bootstrap.js';

function makeFixture({ coarsePointer = false, autoplayAllowed = true } = {}) {
  const listeners = new Map();
  const status = { textContent: '' };
  const diagnostic = { hidden: true, textContent: '' };
  const action = {
    hidden: false,
    disabled: true,
    textContent: '',
    dataset: {},
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { listeners.set(name, callback); },
  };
  const loader = {
    dataset: { state: 'boot' },
    attributes: {},
    querySelector(selector) {
      if (selector === '[data-loader-status]') return status;
      if (selector === '[data-loader-diagnostic]') return diagnostic;
      if (selector === '[data-loader-action]') return action;
      return null;
    },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const doc = {
    querySelector(selector) { return selector === '#cosmic-loader' ? loader : null; },
    createElement() {
      return { style: {}, setAttribute() {}, querySelector() { return null; } };
    },
    body: { append() {} },
  };
  let starts = 0;
  let gestures = 0;
  const controller = {
    async preload() { return true; },
    async canStartAutomatically() { return autoplayAllowed; },
    primeStartGesture() { gestures += 1; },
    async start() { starts += 1; return true; },
  };
  const win = {
    matchMedia(query) { return { matches: query === '(pointer: coarse)' && coarsePointer }; },
  };
  const bootstrap = installProductionCosmicBootstrap({
    doc,
    win,
    runtimeLoader: async () => ({ createProductionCosmicController: () => controller }),
    moduleUrl: 'https://scene.example/cosmic/bootstrap.js',
  });
  return { bootstrap, loader, action, status, diagnostic, listeners, get starts() { return starts; }, get gestures() { return gestures; } };
}

test('desktop waits at READY for ENTRAR even when autoplay would be allowed', async () => {
  const fixture = makeFixture();
  await fixture.bootstrap.preload();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fixture.starts, 0);
  assert.equal(fixture.bootstrap.status, 'ready');
  assert.equal(fixture.loader.dataset.state, 'ready');
  assert.equal(fixture.action.disabled, false);
  assert.equal(fixture.action.textContent, 'ENTRAR');
  assert.equal(fixture.status.textContent, '');
  assert.equal(fixture.diagnostic.textContent, '');

  fixture.listeners.get('click')();
  fixture.listeners.get('click')();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.gestures, 1);
  assert.equal(fixture.starts, 1);
  assert.equal(fixture.bootstrap.status, 'started');
});

test('mobile also waits for the same start gesture', async () => {
  const fixture = makeFixture({ coarsePointer: true, autoplayAllowed: false });
  await fixture.bootstrap.preload();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fixture.starts, 0);
  assert.equal(fixture.bootstrap.status, 'ready');
  assert.equal(fixture.action.hidden, false);
  assert.equal(fixture.action.disabled, false);
  assert.equal(fixture.action.textContent, 'ENTRAR');
  assert.equal(fixture.status.textContent, '');

  fixture.listeners.get('click')();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fixture.gestures, 1);
  assert.equal(fixture.starts, 1);
  assert.equal(fixture.bootstrap.status, 'started');
});
