"""Reference photo vs render: side by side + 50 % blend.  python tools/overlay.py <photo> <render> <out>"""
import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB').resize(a.size)
w = 1600; a2 = a.resize((w, int(a.height * w / a.width))); b2 = b.resize(a2.size)
c = Image.new('RGB', (w, a2.height * 3), 'white'); c.paste(a2, (0, 0)); c.paste(b2, (0, a2.height)); c.paste(Image.blend(a2, b2, .5), (0, 2 * a2.height))
c.save(sys.argv[3]); print(sys.argv[3], c.size)
