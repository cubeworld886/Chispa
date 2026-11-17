"""Compare canonical SVG output at deterministic poses in real Chromium.

Requires Python Playwright and an installed Chromium. No network requests: all
module/assets are fulfilled from --before and --after. This is geometry/material
regression coverage, not a physical GPU benchmark.
"""
import argparse
import hashlib
import json
import mimetypes
from pathlib import Path
import shutil
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


def snapshots(browser, root):
    root = root.resolve()
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def local_resource(route):
        path = (root / unquote(urlsplit(route.request.url).path).lstrip("/")).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            route.fulfill(status=404, body="not found")
            return
        route.fulfill(status=200, body=path.read_bytes(),
                      content_type=mimetypes.guess_type(str(path))[0] or "application/octet-stream",
                      headers={"access-control-allow-origin": "*"})

    page.route("**/*", local_resource)
    page.set_content('<div id="actor" style="position:relative;width:390px;height:844px"></div>')
    result = page.evaluate("""async () => {
      Math.random = () => .123456;
      const base = await import('http://chispa.test/lavender-runtime/dist/runtimeAssetBase.js');
      base.setLavenderAssetBase('http://chispa.test/');
      const {LavenderSvgEngine} = await import('http://chispa.test/lavender-runtime/dist/renderer/LavenderSvgEngine.js');
      const rig = new LavenderSvgEngine(document.querySelector('#actor'), {
        quality: 'optimized', reducedMotion: false, interactive: false,
      });
      await rig.init(); rig.pauseAnimation();
      rig.started = 0; rig.setSceneView(rig.sceneForScreenRect(160, 370, 70));
      rig.setCinematicBodyReveal(1); rig.setCinematicEyeReveal(1);
      const cases = [];
      const states = ['lament', 'attentive', 'thinking', 'confused', 'concerned', 'curious', 'relieved'];
      for (const lock of [true, false]) for (const state of states) {
        rig.setCinematicLock(lock); rig.setCinematicPerformance(true); rig.setState(state);
        rig.stateStarted = 0; rig.transitionStarted = -1000;
        for (const t of [0, 1500, 4500, 12200]) {
          rig.render(t);
          const nodes = [rig.svg, ...rig.svg.querySelectorAll('*')].map(node => ({
            tag: node.tagName,
            attributes: [...node.attributes].map(a => [a.name, a.value]).sort((a,b) => a[0].localeCompare(b[0])),
          }));
          cases.push({lock, state, t, nodes});
        }
      }
      rig.destroy(); return cases;
    }""")
    context.close()
    if errors:
        raise RuntimeError(f"Browser errors for {root}: {errors}")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before", type=Path, required=True)
    parser.add_argument("--after", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--chromium", default=shutil.which("chromium") or shutil.which("google-chrome"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium, headless=True)
        before = snapshots(browser, args.before)
        after = snapshots(browser, args.after)
        browser.close()
    if len(before) != len(after):
        raise AssertionError("Pose count changed")
    differences = []
    for original, updated in zip(before, after):
        if original != updated:
            differences.append({key: original[key] for key in ("lock", "state", "t")})
    report = {"poses": len(before), "exact_matches": len(before) - len(differences),
              "differences": differences,
              "canonical_svg_sha256": hashlib.sha256(json.dumps(before, sort_keys=True).encode()).hexdigest()}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if differences:
        raise AssertionError("Canonical SVG output differs at the listed poses")


if __name__ == "__main__":
    main()
