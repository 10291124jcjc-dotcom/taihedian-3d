"""Render camera presets of a page to PNG.

  python tools/shot.py bracket_test.html front side below      -> out/<page>_<view>.png
"""
import base64, pathlib, sys
from playwright.sync_api import sync_playwright

page_name, views = sys.argv[1], sys.argv[2:]
out = pathlib.Path("out"); out.mkdir(exist_ok=True)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    pg = b.new_page(viewport={"width": 800, "height": 600})
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.add_init_script("window.__CAPTURE__ = true;")
    pg.goto(pathlib.Path(page_name).resolve().as_uri())
    try:
        pg.wait_for_function("window.READY === true", timeout=120000)
    except Exception:
        print("not ready:", errors[:5]); sys.exit(1)
    if errors: print("JS errors:", errors[:5])
    info = pg.evaluate("window.INFO ? JSON.stringify({h: INFO.heights, b: [INFO.brackets, INFO.bracketsLo, INFO.bracketsUp], r: INFO.rafters, t: INFO.tiles, f: INFO.fScale, k: INFO.k}) : null")
    if info: print(info)
    for v in views:
        data = pg.evaluate(f"STAGE.view('{v}')")
        f = out / f"{pathlib.Path(page_name).stem}_{v}.png"
        f.write_bytes(base64.b64decode(data.split(",", 1)[1]))
        print(f)
    b.close()
