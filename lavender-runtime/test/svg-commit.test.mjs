import test from 'node:test';
import assert from 'node:assert/strict';
let api;
try { api = await import('../dist/performance/svgCommit.js'); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }

test('unchanged SVG attributes do not invalidate the DOM; externally changed values are repaired', () => {
  assert.ok(api, 'the SVG commit utility exists');
  const attributes = new Map(); let writes = 0;
  const element = { getAttribute: key => attributes.get(key) ?? null, setAttribute(key, value) { writes++; attributes.set(key, value); } };
  api.setSvgAttribute(element, 'opacity', .5);
  api.setSvgAttribute(element, 'opacity', '.5'); // SVG string spelling is significant to an exact commit.
  api.setSvgAttribute(element, 'opacity', '.5');
  assert.equal(writes, 2);
  attributes.set('opacity', '0'); api.setSvgAttribute(element, 'opacity', '.5');
  assert.equal(writes, 3); assert.equal(attributes.get('opacity'), '.5');
  assert.doesNotThrow(() => api.setSvgAttribute(undefined, 'd', ''));
});

test('exact geometry reuses serialized paths without quantizing or losing accumulated motion', () => {
  assert.ok(api); const cache = new api.SvgPathCache(2); let formats = 0;
  const format = points => { formats++; return JSON.stringify(points); };
  const a = [[1, 2], [3, 4]];
  const initial = cache.resolve('eye', a, format);
  assert.equal(cache.resolve('eye', [[1, 2], [3, 4]], format), initial);
  assert.equal(formats, 1);
  a[0][0] = 1.00001;
  assert.notEqual(cache.resolve('eye', a, format), initial);
  assert.equal(formats, 2);
  cache.resolve('body', [[0, 0]], format); cache.resolve('mask', [[0, 0]], format);
  assert.equal(cache.size, 2); cache.clear(); assert.equal(cache.size, 0);
});
