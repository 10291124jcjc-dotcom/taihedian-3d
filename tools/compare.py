"""Side-by-side: reference photo crop | render.  python tools/compare.py <ref.jpg> x0 y0 x1 y1 <render.png> <out.png>"""
import sys
from PIL import Image, ImageDraw
ref, x0, y0, x1, y1, ren, out = sys.argv[1], *map(float, sys.argv[2:6]), sys.argv[6], sys.argv[7]
a = Image.open(ref).convert('RGB'); W, H = a.size; a = a.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
b = Image.open(ren).convert('RGB')
h = 900; a = a.resize((int(a.width * h / a.height), h)); b = b.resize((int(b.width * h / b.height), h))
c = Image.new('RGB', (a.width + b.width + 20, h + 50), 'white'); c.paste(a, (0, 50)); c.paste(b, (a.width + 20, 50))
d = ImageDraw.Draw(c); d.text((10, 15), 'REFERENCE PHOTO (Wikimedia Commons, internal only)', fill='black'); d.text((a.width + 30, 15), 'RENDER', fill='black')
c.save(out); print(out, c.size)
