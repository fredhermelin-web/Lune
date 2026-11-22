"""Réduit le catalogue d3-celestial (données HYG) en data/sky.json pour l'application.
python -E -P -X utf8 tools/make_sky.py <dossier contenant stars.6.json, constellations.lines.json, starnames.json>"""
import json, os, sys

src = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAG_LIMIT = 5.6

stars = json.load(open(os.path.join(src, 'stars.6.json'), encoding='utf-8'))['features']
names = json.load(open(os.path.join(src, 'starnames.json'), encoding='utf-8'))
lines = json.load(open(os.path.join(src, 'constellations.lines.json'), encoding='utf-8'))['features']

SPECIAL = {
    'polaris': 11767, 'dubhe': 54061, 'merak': 53910, 'phecda': 58001, 'megrez': 59774,
    'alioth': 62956, 'mizar': 65378, 'alcor': 65477, 'alkaid': 67301,
    'caph': 746, 'schedar': 3179, 'gcas': 4427, 'ruchbah': 6686, 'segin': 8886,
    'alcyone': 17702,
}
special_ids = set(SPECIAL.values())

keep = [s for s in stars if s['properties']['mag'] <= MAG_LIMIT or s['id'] in special_ids]
keep.sort(key=lambda s: s['properties']['mag'])

out_stars, out_names, index_of = [], {}, {}
for i, s in enumerate(keep):
    ra, dec = s['geometry']['coordinates']
    ra = ra % 360
    try:
        bv = round(float(s['properties']['bv']), 2)
    except (TypeError, ValueError):
        bv = 0.6
    out_stars.append([round(ra, 3), round(dec, 3), round(s['properties']['mag'], 2), bv])
    index_of[s['id']] = i
    n = names.get(str(s['id']), {}).get('name', '')
    if n and (s['properties']['mag'] < 2.6 or s['id'] in special_ids):
        out_names[i] = n

special = {}
for key, hip in SPECIAL.items():
    if hip not in index_of:
        print('MANQUANT', key, hip)
        continue
    special[key] = index_of[hip]
    st = out_stars[index_of[hip]]
    print(f'{key:8s} HIP {hip:6d} -> {names.get(str(hip), {}).get("name", "?"):10s} mag {st[2]:5.2f}  ra {st[0]:8.3f} dec {st[1]:7.3f}')

out_lines = {}
for f in lines:
    out_lines[f['id']] = [[[round(p[0] % 360, 2), round(p[1], 2)] for p in seg] for seg in f['geometry']['coordinates']]

os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
path = os.path.join(ROOT, 'data', 'sky.json')
json.dump({'stars': out_stars, 'names': out_names, 'special': special, 'lines': out_lines,
           'source': 'd3-celestial (O. Frohn, BSD-3) / HYG database (D. Nash, CC BY-SA)'},
          open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out_stars), 'étoiles,', len(out_names), 'noms,', len(out_lines), 'constellations,', os.path.getsize(path) // 1024, 'Ko')
