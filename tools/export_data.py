"""Dump every number the model is built from to data/taihedian.json (parameters with sources, column grid, terrace, furnishings, counts)."""
import json, pathlib
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True); pg = b.new_page(); pg.add_init_script("window.__CAPTURE__=true;")
    pg.goto(pathlib.Path('hall.html').resolve().as_uri() + '?w=320&h=200&post=0'); pg.wait_for_function("window.READY===true", timeout=300000)
    data = pg.evaluate("""() => {
      const params = {}; for (const [k, v] of Object.entries(P)) if (Array.isArray(v)) params[k] = { value: v[0], source: v[1], note: v[2] };
      const r = x => Math.round(x * 1000) / 1000, I = HALL.info;
      return {
        units: 'metres; x east, z south (front), y up; origin = centre of the hall floor (台明); 1 清尺 = 0.32 m',
        sourceTags: { record: '《太和殿纪事》 via 王子林 2020 / 刘畅', dpm: '故宫博物院官网', photo: 'measured on public photos', rule: '清工部《工程做法》 proportion', fit: 'fitted to photos' },
        params,
        columnLines: { x: P.xLines().map(r), z: P.zLines().map(r) },
        derived: { doukou: r(P.d()), heights: Object.fromEntries(Object.entries(I.heights).map(([k, v]) => [k, r(v)])), upperRoofRiseScale: r(I.fScale), upperRoofTuishanK: r(I.k) },
        counts: { bracketSetsExterior: I.brackets, lower: I.bracketsLo, upper: I.bracketsUp, rafters: I.rafters, tiles: I.tiles, balustradePosts: TER.info.posts, chishou: TER.info.chishou, ding: FUR.info.ding },
        terrace: { tierHeights: TER.H, tiers: TER.TIERS, stairs: TER.STAIRS, balustrade: TER.BAL,
          note: 'plan from OpenStreetMap building:part outlines (© OpenStreetMap contributors, ODbL), made symmetric, shifted 6.9 m north after checking Esri World Imagery' },
        furnishings: { ding: [[49.6, 'tier3', [-22.9, -15.3, -5.9, 5.9, 15.3, 22.9]], [55.7, 'tier2', [-15.5, -5.9, 5.9, 15.5]], [63.3, 'tier1', [-15.5, -5.9, 5.9, 15.5]], [73.2, 'plaza', [-15.5, -5.9, 5.9, 15.5]]],
          rigui: [30, 50], jialiang: [-30, 50], gui: [[-30.8, 31], [30.8, 31]], he: [[-30.8, 36], [30.8, 36]], note: '鼎 positions from satellite imagery; 龟/鹤 inferred from shadows (approximate)' },
        photoCamera_gje06: { pos: [1.0, -1.3, 191.2], pitchDownDeg: 1.54, focalPx3840: 6197 },
      };
    }""")
    b.close()
pathlib.Path('data/taihedian.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
print('params', len(data['params']), 'counts', data['counts'])
