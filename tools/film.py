"""Render the 16:9 film.  python tools/film.py [--stills 0.5,4.5,...]  -> out/frames_16x9.mp4 or out/film_<t>.jpg"""
import base64, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
args = sys.argv[1:]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True); pg = b.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.add_init_script("window.__CAPTURE__=true;")
    pg.goto(pathlib.Path('hall.html').resolve().as_uri() + '?w=1920&h=1080'); pg.wait_for_function("window.READY===true", timeout=300000)
    pg.evaluate("document.fonts.load('900 60px \"Noto Serif SC\"').then(()=>document.fonts.load('500 36px \"Noto Serif SC\"'))")
    if errs: print(errs); sys.exit(1)
    grab = lambda t: base64.b64decode(pg.evaluate(f"filmFrame({t})").split(',', 1)[1])
    if args and args[0] == '--stills':
        for t in args[1].split(','):
            f = pathlib.Path(f'out/film_{float(t):05.2f}.jpg'); f.write_bytes(grab(float(t))); print(f)
    else:
        dur, fps = pg.evaluate("FILM.DUR"), pg.evaluate("FILM.FPS"); n = int(dur * fps)
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
                               "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv444p", "out/frames_16x9.mp4"], stdin=subprocess.PIPE)
        t0 = time.time()
        for i in range(n):
            ff.stdin.write(grab(i / fps))
            if i % 60 == 0: print(f"frame {i}/{n} {time.time() - t0:.0f}s", flush=True)
        ff.stdin.close(); ff.wait(); print("done", n, f"{time.time() - t0:.0f}s")
    b.close()
