"""Count rendering work in the actual page, without any network access.

Requires Python Playwright and Chromium. Mobile means viewport/touch emulation,
NOT an iPhone/Safari or GPU/battery benchmark. SVG instrumentation affects timing,
so compare work counts rather than treating these runs as production FPS tests.
The about:blank harness substitutes storage and locally fulfills every resource.
"""
import argparse
import json
import mimetypes
from pathlib import Path
import shutil
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

INSTRUMENT = """() => {
  Object.defineProperty(window, 'localStorage', {value: {getItem:()=>null, setItem:()=>{}, removeItem:()=>{}}});
  window.__audit = {started:0, bins:{}, engine:null};
  window.__bump = key => {
    if (!__audit.started) return;
    const sec = Math.floor((performance.now()-__audit.started)/1000);
    const bin = __audit.bins[sec] ||= {};
    bin[key] = (bin[key] || 0)+1;
  };
  const attribute = SVGElement.prototype.setAttribute;
  SVGElement.prototype.setAttribute = function(key, value) {
    __bump('attributes');
    if (this.getAttribute(key) === String(value)) __bump('unchanged');
    return attribute.call(this, key, value);
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = fn => raf(time => { __bump('nativeCallbacks'); return fn(time); });
  let seed = 42;
  Math.random = () => { seed=(Math.imul(1664525,seed)+1013904223)>>>0; return seed/4294967296; };
}"""
ENGINE_PROBE = """
const auditRender=LavenderSvgEngine.prototype.render;
LavenderSvgEngine.prototype.render=function(time){window.__audit.engine=this;window.__bump('renders');return auditRender.call(this,time);};
const auditForce=LavenderSvgEngine.prototype.forceVisibleFrame;
LavenderSvgEngine.prototype.forceVisibleFrame=function(){window.__bump('forced');return auditForce.call(this);};
"""
SNAPSHOT = """() => ({
  bins: __audit.bins, elapsed:(performance.now()-__audit.started)/1000,
  actorFps:__audit.engine?.performance?.maxFps,
  animations:document.getAnimations().length,
  shardAnimations:document.getAnimations().filter(a=>a.effect?.target?.closest?.('[data-cosmic-shard]')).length,
  narration:window.__chispaNarrativePreview?.getStatus(),
  coordinator:window.chispaFrames?.getSnapshot?.(),
  webglCanvases:document.querySelectorAll('.cosmic-webgl-canvas').length,
})"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, required=True, help='JSON result path; PNGs are saved alongside it')
    parser.add_argument('--desktop', action='store_true')
    parser.add_argument('--chromium', default=shutil.which('chromium') or shutil.which('google-chrome'))
    args = parser.parse_args()
    root = args.root.resolve()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    engine = root / 'lavender-runtime/dist/renderer/LavenderSvgEngine.js'
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium, headless=True,
                    args=['--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
        context = browser.new_context(
            viewport={'width':1365 if args.desktop else 390, 'height':900 if args.desktop else 844},
            device_scale_factor=1 if args.desktop else 3,
            is_mobile=not args.desktop, has_touch=not args.desktop)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.evaluate(INSTRUMENT)

        def local_resource(route):
            relative = unquote(urlsplit(route.request.url).path).lstrip('/')
            path = (root / relative).resolve()
            if not path.is_relative_to(root) or not path.is_file():
                route.fulfill(status=404, body='not found')
                return
            body = path.read_bytes()
            if path == engine:
                body += ENGINE_PROBE.encode()
            route.fulfill(status=200, body=body,
                          content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream',
                          headers={'access-control-allow-origin':'*'})

        page.route('**/*', local_resource)
        html = (root / 'index.html').read_text().replace('<head>', '<head><base href="http://chispa.test/">', 1)
        page.set_content(html, wait_until='load', timeout=30000)
        page.wait_for_function("['ready','error'].includes(document.querySelector('#cosmic-loader').dataset.state)",
                               timeout=30000, polling=100)
        if page.locator('#cosmic-loader').get_attribute('data-state') != 'ready':
            raise RuntimeError('Scene preparation failed')
        page.evaluate('if(window.chispaFrames)window.chispaFrames.diagnostics=true;__audit.started=performance.now()')
        page.locator('[data-loader-action]').click()
        page.wait_for_function("document.querySelector('#cosmic-event-layer')?.dataset.phase==='realization'",
                               timeout=25000, polling=100)
        page.screenshot(path=str(args.output.with_name(args.output.stem+'-reveal.png')))
        page.wait_for_function("window.__chispaNarrativePreview?.getStatus().state==='running'",
                               timeout=25000, polling=100)
        page.wait_for_timeout(7000)
        page.screenshot(path=str(args.output.with_name(args.output.stem+'-narrative.png')))
        report = page.evaluate(SNAPSHOT)
        report.update(errors=errors, browser=browser.version, desktop=args.desktop,
                      methodology='instrumented local Chromium; SwiftShader; not physical-device FPS')
        browser.close()
    args.output.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))
    if errors:
        raise RuntimeError(f'Page errors: {errors}')
    if report['narration']['state'] != 'running' or report['webglCanvases'] != 0:
        raise AssertionError('Narrative or heavy VFX lifetime regression')


if __name__ == '__main__':
    main()
