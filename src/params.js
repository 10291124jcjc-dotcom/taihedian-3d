/* 太和殿参数表 — the only place numbers live. Units: metres. 1 清尺 = 0.32 m (王子林 2020).
   src: 'record'  《太和殿纪事》via 王子林《清代太和殿的两次重建》(故宫博物院院刊 2020-10) / 刘畅 transcription
        'dpm'     故宫博物院官网 太和殿 page
        'photo'   measured on public reference photos (Wikimedia Commons, 2020-01-10 series)
        'rule'    清工部《工程做法》standard proportion, used only where nothing measured exists
   Every value: [number, src, note]. Read with P.v(key). */
const CHI = 0.32;
const P = {
  // ---------------- plan (column centres) ----------------
  bayW: [[11.1, 26.35, 17.3], 'record', '面阔：两边间 11.1 尺、明间 26.35 尺、次间 8×17.3 尺'],
  bayD: [[11.1, 34.85, 23.27], 'record', '进深：两边间 11.1 尺、山明间 34.85 尺、两次间 23.27 尺'],
  // ---------------- columns ----------------
  eaveColH: [23 * CHI, 'record', '檐柱高二丈三尺 = 7.36 m'],
  eaveColD: [0.64, 'photo', '檐柱径：close_up-1 中 845 px = 明间 8.432 m，柱宽约 64 px'],
  goldColD: [3.2 * CHI, 'record', '金柱径三尺二寸 = 1.024 m'],
  // ---------------- module ----------------
  doukou: [0.937 / 11, 'photo', '斗口：明间下檐 8 攒平身科 = 9 攒当，8.432/9 = 0.937 m，按攒当 11 斗口反推 = 0.085 m；文献称用材不足三寸'],
  rafterPitch: [0.27, 'photo', '椽当：明间约 31 根飞椽头'],
  rafterD: [0.17, 'photo', '椽径：close_up-1 中椽头约 17–18 px（0.0099 m/px）；规则值 1.5 斗口 = 0.128 m 偏细'],
  tileRow: [0.36, 'photo', '瓦陇距：gje06 正立面下檐勾头行自相关周期 0.366 m（含近大透视约 −2%）；与《太和殿纪事》下檐勾头 586、上檐勾滴 1008 件反推的 0.352–0.357 m 吻合'],
  // ---------------- lower eave (下檐) ----------------
  lowerPitch: [0.5, 'rule', '下檐檐步五举'],
  flyPitch: [0.3, 'rule', '飞椽较檐椽平缓'],
  eaveOut: [21, 'rule', '上檐出：挑檐桁中至飞椽头 21 斗口（檐椽 14 + 飞椽 7）'],
  bracketOut: [9, 'rule', '七踩斗拱出 3 拽架 × 3 斗口 = 9 斗口'],
  bracketH: [12, 'photo', '平板枋上皮至挑檐桁底约 12 斗口：照片中斗拱带高 ≈ 1.1 × 攒当'],
  wingOut: [4.5, 'rule', '翼角冲出 3 椽径 = 4.5 斗口（冲三）'],
  wingUp: [6, 'rule', '翼角起翘 4 椽径 = 6 斗口（翘四）'],
  // ---------------- upper eave (上檐) and roof ----------------
  upperColH: [39.5 * CHI, 'record', '金柱长三丈九尺五寸 = 12.64 m，取作上檐柱顶（上檐平板枋底）'],
  lowerInPitch: [0.4, 'fit', '下檐檐步（檐柱→金柱承椽枋）四举：五举会使围脊顶 12.0 m 高过上檐小额枋底 11.6 m，照片中二者之间可见完整额枋带'],
  ridgeTop: [26.92, 'dpm', '正脊顶 = 官网殿高 26.92 m（官网通高 35.05 = 26.92 + 台基 8.13）。照片核对：gje06 以 8 个地标拟合机位（距殿中心 191 m、低于殿地面 1.3 m、俯 1.5°，上下檐口残差 ≤ 5 px），得正脊顶 26.3 m。《太和殿纪事》正中高 23.87 m 应为脊桁高'],
  ridgeH: [1.3, 'photo', '正脊露明高约 1.3 m：gje06 中约 40 px（z=0 处 32.3 px/m）'],
  ridgeHalf: [13.75, 'photo', '正脊半长（至正吻中线）：gje06 两吻中距约 690 px = 27.5 m；含推山'],
  upperJu: [[0.42, 0.47, 0.55, 0.63, 0.73], 'fit', '上檐五步举架：使脊桁高与正中高 23.87 m 吻合（照片中屋面下凹、上陡）'],
  wingStartUp: [2.6, 'rule', '上檐翼角自第一步架起翘'],
  // ---------------- doors, windows ----------------
  doorH: [5.1, 'photo', '隔扇高：close_up-3 中隔扇顶低于小额枋底约 1.24 m'],
  sillWallH: [1.05, 'photo', '槛墙高：close_up-3 右端槛墙约 90 px（≈ 85 px/m）'],
  windowBays: [['边间', '四次间'], 'record', '《太和殿纪事》"前槛墙四堵"，close_up-3 右端可见槛窗与琉璃槛墙；具体为哪四间待核'],
  plaque: [[2.2, 2.6], 'photo', '匾额宽 × 高：gje06 约 55 × 65 px'],
  queti: [[0.26, 0.7], 'photo', '雀替长（占开间比例）× 高 (m)：close_up-3'],
  // ---------------- ornaments ----------------
  beasts: [['龙', '凤', '狮子', '天马', '海马', '狻猊', '押鱼', '獬豸', '斗牛', '行什'], 'dpm', '仙人 + 10 走兽，顺序见《大清会典》转述（待核）'],
  beastH: [0.5, 'photo', '走兽高约 0.5 m：roof_art-1 中约为勾头间距的 1.25 倍'],
  beastGap: [0.53, 'photo', '走兽间距约 0.53 m：约为勾头间距的 1.3 倍'],
  tileColor: ['#A9650A', 'photo', '琉璃瓦在晴天侧光下的受光面颜色（roof_art-1 取样）'],
};
P.v = k => P[k][0];
P.d = () => P.v('doukou');
// column-line coordinates (centred on the hall): x along the facade (east +), z toward the front (south +)
P.lines = (bays) => { const xs = [0]; bays.forEach(b => xs.push(xs[xs.length - 1] + b)); const h = xs[xs.length - 1] / 2; return xs.map(x => x - h); };
P.xLines = () => { const [e, m, c] = P.v('bayW'); return P.lines([e, c, c, c, c, m, c, c, c, c, e].map(b => b * CHI)); };
P.zLines = () => { const [e, m, c] = P.v('bayD'); return P.lines([e, c, m, c, e].map(b => b * CHI)); };
window.P = P;
