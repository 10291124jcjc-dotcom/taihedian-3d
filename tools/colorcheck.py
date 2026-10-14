"""Sample mean colours of named regions in the reference photo and the same-camera render (front view)."""
import sys
from PIL import Image
import numpy as np
ph = np.asarray(Image.open(sys.argv[1]).convert('RGB').resize((1920, 1236))).astype(float)
rn = np.asarray(Image.open(sys.argv[2]).convert('RGB').resize((1920, 1236))).astype(float)
R = {'upper roof': (860, 150, 1060, 200), 'lower roof': (700, 335, 900, 360), 'column (sunlit)': None, 'upper beams': (700, 280, 900, 300),
     'balustrade top tier': (300, 640, 600, 668), 'sky': (100, 60, 300, 120)}
for k, b in R.items():
    if not b: continue
    x0, y0, x1, y1 = b; a = ph[y0:y1, x0:x1].reshape(-1, 3); c = rn[y0:y1, x0:x1].reshape(-1, 3)
    print(f'{k:22s} photo {a.mean(0).round()}  render {c.mean(0).round()}  ratio {(a.mean(0) / np.maximum(c.mean(0), 1)).round(2)}')
