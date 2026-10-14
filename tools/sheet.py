import sys, glob
from PIL import Image, ImageDraw
fs = sorted(glob.glob('out/film_*.jpg')); cols = 3; w, h = 640, 360
c = Image.new('RGB', (w * cols, h * ((len(fs) + cols - 1) // cols)), 'white')
for i, f in enumerate(fs):
    im = Image.open(f).resize((w, h)); d = ImageDraw.Draw(im); d.rectangle([0, 0, 70, 26], fill='black'); d.text((6, 6), f[9:14], fill='white')
    c.paste(im, ((i % cols) * w, (i // cols) * h))
c.save(sys.argv[1] if len(sys.argv) > 1 else 'out/film_sheet.jpg'); print(len(fs))
