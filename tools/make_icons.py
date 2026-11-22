"""Génère les icônes de l'application : une vraie Lune gibbeuse rendue depuis la carte NASA.
python -E -P tools/make_icons.py   (nécessite numpy et Pillow)"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tex = np.asarray(Image.open(os.path.join(ROOT, 'textures', 'moon_color_4k.jpg')).convert('RGB'), dtype=np.float64) / 255
th, tw = tex.shape[:2]

def render(size, radius_frac, bg_glow=True):
    ss = 3                                  # sur-échantillonnage pour un bord net
    n = size * ss
    y, x = np.mgrid[0:n, 0:n]
    cx = cy = (n - 1) / 2
    R = n * radius_frac
    u, v = (x - cx) / R, (cy - y) / R
    r2 = u * u + v * v
    inside = r2 <= 1
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    lat = np.arcsin(np.clip(v, -1, 1))
    lon = np.arctan2(u, z)
    px = ((0.5 + lon / (2 * np.pi)) * tw).astype(int) % tw
    py = np.clip(((0.5 - lat / np.pi) * th).astype(int), 0, th - 1)
    alb = tex[py, px] ** 2.2
    sun = np.array([0.82, 0.18, 0.55]); sun /= np.linalg.norm(sun)    # gibbeuse, éclairée à droite
    mu0 = np.clip(u * sun[0] + v * sun[1] + z * sun[2], 0, None)
    mu = np.clip(z, 0.02, None)
    light = 2 * 0.7 * mu0 / (mu0 + mu) + 0.3 * mu0
    col = alb * light[..., None] + alb * 0.018
    lum = col @ np.array([0.2126, 0.7152, 0.0722])
    col = lum[..., None] + (col - lum[..., None]) * 0.6
    col = (1 - np.exp(-col * 3.3)) ** (1 / 2.2)

    d = np.sqrt(r2)
    bg = np.zeros((n, n, 3))
    bg[:] = np.array([4, 6, 10]) / 255
    if bg_glow:
        glow = np.exp(-np.clip(d - 1, 0, None) * 5.5) * 0.10
        bg += glow[..., None] * np.array([0.85, 0.9, 1.0])
    out = np.where(inside[..., None], col, bg)
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGB')
    return img.resize((size, size), Image.LANCZOS)

os.makedirs(os.path.join(ROOT, 'icons'), exist_ok=True)
render(192, 0.40).save(os.path.join(ROOT, 'icons', 'icon-192.png'), optimize=True)
render(512, 0.40).save(os.path.join(ROOT, 'icons', 'icon-512.png'), optimize=True)
render(512, 0.33).save(os.path.join(ROOT, 'icons', 'icon-maskable-512.png'), optimize=True)
print('ok')
