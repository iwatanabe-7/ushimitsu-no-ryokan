// 手続き生成テクスチャ。外部画像を使わず、すべて canvas で描く。
import * as THREE from 'three';

export const FONT = '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = [1, 1], srgb = true, rotate = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.repeat.set(repeat[0], repeat[1]);
  if (rotate) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  return t;
}

// 低解像度の乱数を拡大して描くことで、なめらかなムラを作る
function smoothNoise(ctx, w, h, cells, alpha, seed, tint = [0, 0, 0]) {
  const r = rng(seed);
  const [nc, nx] = makeCanvas(cells, Math.max(1, Math.round((cells * h) / w)));
  const img = nx.createImageData(nc.width, nc.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r();
    img.data[i] = tint[0];
    img.data[i + 1] = tint[1];
    img.data[i + 2] = tint[2];
    img.data[i + 3] = v * 255 * alpha;
  }
  nx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(nc, 0, 0, w, h);
  ctx.restore();
}

function speckle(ctx, w, h, count, seed, colors, size = 1.5) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(r() * colors.length) | 0];
    const s = size * (0.4 + r());
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

// 畳一枚（0.9m × 1.8m）。い草の目は短辺方向に走る
export function tatamiTexture(seed = 1) {
  const W = 256, H = 512;
  const [c, x] = makeCanvas(W, H);
  const r = rng(seed);
  x.fillStyle = '#a99f63';
  x.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 3) {
    const l = 40 + r() * 10;
    x.fillStyle = `hsl(${50 + r() * 6}, ${28 + r() * 8}%, ${l}%)`;
    x.fillRect(0, y, W, 2);
    x.fillStyle = 'rgba(40,34,10,0.35)';
    x.fillRect(0, y + 2, W, 1);
  }
  // 経糸
  x.fillStyle = 'rgba(50,40,15,0.18)';
  for (let px = 6; px < W; px += 15) x.fillRect(px, 0, 1, H);
  smoothNoise(x, W, H, 8, 0.25, seed + 7, [70, 55, 20]);
  smoothNoise(x, W, H, 24, 0.12, seed + 9, [255, 240, 190]);
  // 畳縁（へり）
  const hw = 11;
  for (const px of [0, W - hw]) {
    x.fillStyle = '#16140f';
    x.fillRect(px, 0, hw, H);
    x.fillStyle = 'rgba(120,100,60,0.25)';
    for (let y = 0; y < H; y += 8) x.fillRect(px + 2, y, hw - 4, 1);
  }
  x.fillStyle = 'rgba(0,0,0,0.5)';
  x.fillRect(0, 0, W, 2);
  x.fillRect(0, H - 2, W, 2);
  return toTexture(c);
}

// 聚楽壁（土壁）
export function wallTexture(seed = 3) {
  const S = 512;
  const [c, x] = makeCanvas(S, S);
  x.fillStyle = '#8a7556';
  x.fillRect(0, 0, S, S);
  smoothNoise(x, S, S, 6, 0.35, seed, [60, 45, 28]);
  smoothNoise(x, S, S, 32, 0.18, seed + 1, [190, 170, 130]);
  smoothNoise(x, S, S, 128, 0.12, seed + 2, [40, 30, 20]);
  speckle(x, S, S, 9000, seed + 3, ['#b9a47e', '#5e4a33', '#9c8460', '#c8b08a'], 1.4);
  speckle(x, S, S, 500, seed + 4, ['#d9c39a', '#3d2f20'], 2.4);
  return [c, x];
}

export function wallMap(repeat) {
  if (!wallMap.canvas) wallMap.canvas = wallTexture()[0];
  return toTexture(wallMap.canvas, { repeat });
}

// 木目。縦に走る年輪
function woodCanvas(base, seed, W = 256, H = 1024, contrast = 1) {
  const [c, x] = makeCanvas(W, H);
  const r = rng(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, W, H);
  smoothNoise(x, W, H, 4, 0.3 * contrast, seed, [30, 15, 5]);
  for (let i = 0; i < 70; i++) {
    let px = r() * W;
    const wob = 2 + r() * 6;
    const freq = 0.004 + r() * 0.01;
    const ph = r() * 10;
    x.strokeStyle = `rgba(${20 + r() * 30},${10 + r() * 15},5,${(0.12 + r() * 0.25) * contrast})`;
    x.lineWidth = 0.6 + r() * 2.2;
    x.beginPath();
    for (let y = 0; y <= H; y += 8) {
      const xx = px + Math.sin(y * freq + ph) * wob;
      if (y === 0) x.moveTo(xx, y);
      else x.lineTo(xx, y);
    }
    x.stroke();
  }
  smoothNoise(x, W, H, 64, 0.08, seed + 5, [255, 220, 170]);
  return c;
}

const woodCache = {};
export function woodMap(kind = 'pillar', { repeat = [1, 1], rotate = false } = {}) {
  const presets = {
    pillar: ['#6b4a2c', 11, 1],
    dark: ['#3a2416', 12, 0.8],
    cedar: ['#7b5a3c', 13, 1.1],
    floor: ['#4a2e1a', 14, 0.9],
    toko: ['#2e1b10', 15, 0.6],
    light: ['#9b7b55', 16, 0.9],
  };
  if (!woodCache[kind]) {
    const [base, seed, con] = presets[kind];
    woodCache[kind] = woodCanvas(base, seed, 256, 1024, con);
  }
  return toTexture(woodCache[kind], { repeat, rotate });
}

// 廊下の板張り（長手が x 方向）
export function floorBoardsTexture() {
  const W = 1024, H = 512;
  const [c, x] = makeCanvas(W, H);
  const grain = woodCanvas('#4b2f1b', 21, 256, 1024, 0.9);
  const r = rng(22);
  const rows = 4;
  const bh = H / rows;
  for (let i = 0; i < rows; i++) {
    x.save();
    x.translate(0, i * bh);
    // 木目を横向きに貼る（板ごとに木目の位置をずらす）
    x.save();
    x.translate(W, 0);
    x.rotate(Math.PI / 2);
    const off = r() * 160;
    x.drawImage(grain, off, 0, 256 - off, 1024, 0, 0, bh, W);
    x.restore();
    x.fillStyle = `rgba(0,0,0,${r() * 0.18})`;
    x.fillRect(0, 0, W, bh);
    x.fillStyle = 'rgba(10,5,2,0.85)';
    x.fillRect(0, 0, W, 2);
    const joint = 200 + r() * 600;
    x.fillRect(joint, 0, 2, bh);
    x.restore();
  }
  return toTexture(c);
}

// 襖紙。椿の間の襖には色の抜けた椿の枝を描く
export function fusumaTexture({ seed = 31, camellia = false, karakami = false } = {}) {
  const W = 512, H = 1024;
  const [c, x] = makeCanvas(W, H);
  const r = rng(seed);
  x.fillStyle = '#d6cbb0';
  x.fillRect(0, 0, W, H);
  smoothNoise(x, W, H, 5, 0.22, seed, [120, 100, 60]);
  // 和紙の繊維
  for (let i = 0; i < 700; i++) {
    x.strokeStyle = `rgba(255,250,235,${0.15 + r() * 0.3})`;
    x.lineWidth = 0.5 + r();
    const px = r() * W, py = r() * H, a = r() * Math.PI * 2, l = 4 + r() * 18;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a + 0.6) * l * 0.6, py + Math.sin(a + 0.6) * l * 0.6, px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.stroke();
  }
  if (karakami) {
    x.fillStyle = 'rgba(170,150,105,0.35)';
    for (let yy = 30; yy < H; yy += 64) {
      for (let xx = (yy / 64) % 2 ? 32 : 0; xx < W + 32; xx += 64) {
        x.beginPath();
        x.arc(xx, yy, 14, 0, Math.PI * 2);
        x.arc(xx, yy, 9, 0, Math.PI * 2, true);
        x.fill();
      }
    }
  }
  if (camellia) {
    // 遠山（薄墨）
    x.fillStyle = 'rgba(80,80,80,0.12)';
    x.beginPath();
    x.moveTo(0, 700);
    for (let xx = 0; xx <= W; xx += 16) x.lineTo(xx, 640 - Math.sin(xx * 0.012) * 60 - Math.sin(xx * 0.031) * 25);
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.fill();
    // 枝
    x.strokeStyle = 'rgba(60,40,25,0.55)';
    x.lineCap = 'round';
    const branch = (sx, sy, ang, len, wdt, depth) => {
      if (depth <= 0 || len < 10) return;
      const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
      x.lineWidth = wdt;
      x.beginPath();
      x.moveTo(sx, sy);
      x.quadraticCurveTo((sx + ex) / 2 + 10, (sy + ey) / 2 - 8, ex, ey);
      x.stroke();
      // 葉
      x.fillStyle = 'rgba(40,60,40,0.35)';
      for (let k = 0; k < 2; k++) {
        x.save();
        x.translate(ex, ey);
        x.rotate(ang + (k ? 0.9 : -0.9));
        x.beginPath();
        x.ellipse(14, 0, 16, 7, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
      }
      if (r() < 0.55) {
        // 花（色褪せた紅）
        x.fillStyle = 'rgba(150,40,45,0.5)';
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2;
          x.beginPath();
          x.arc(ex + Math.cos(pa) * 9, ey + Math.sin(pa) * 9, 10, 0, Math.PI * 2);
          x.fill();
        }
        x.fillStyle = 'rgba(200,160,60,0.6)';
        x.beginPath();
        x.arc(ex, ey, 4, 0, Math.PI * 2);
        x.fill();
      }
      branch(ex, ey, ang - 0.4 - r() * 0.3, len * 0.72, wdt * 0.7, depth - 1);
      branch(ex, ey, ang + 0.35 + r() * 0.3, len * 0.65, wdt * 0.65, depth - 1);
    };
    branch(-10, 300, -0.15, 150, 9, 5);
  }
  // 日焼けと手垢
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(90,70,30,0.12)');
  g.addColorStop(0.6, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(60,45,25,0.22)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return toTexture(c);
}

// 障子。月明かりで裏から照らされる
export function shojiTexture() {
  const W = 512, H = 512;
  const [c, x] = makeCanvas(W, H);
  x.fillStyle = '#e9e6dc';
  x.fillRect(0, 0, W, H);
  smoothNoise(x, W, H, 6, 0.15, 41, [150, 140, 120]);
  x.fillStyle = '#2a1c12';
  const cols = 4, rows = 6;
  for (let i = 0; i <= cols; i++) x.fillRect((i * W) / cols - (i === 0 ? 0 : i === cols ? 14 : 5), 0, i === 0 || i === cols ? 14 : 10, H);
  for (let j = 0; j <= rows; j++) x.fillRect(0, (j * H) / rows - (j === 0 ? 0 : j === rows ? 14 : 4), W, j === 0 || j === rows ? 14 : 8);
  // 破れ目
  x.fillStyle = 'rgba(20,20,30,0.9)';
  x.beginPath();
  x.moveTo(300, 210);
  x.lineTo(318, 204);
  x.lineTo(326, 226);
  x.lineTo(309, 236);
  x.closePath();
  x.fill();
  return toTexture(c);
}

// 月光のスポットライトに投影する障子の格子影（光の円錐全体に格子を敷き詰める）
export function latticeLightMap() {
  const S = 512;
  const [c, x] = makeCanvas(S, S);
  x.fillStyle = '#fff';
  x.fillRect(0, 0, S, S);
  x.fillStyle = '#000';
  const cols = 11, rows = 26;
  for (let i = 0; i <= cols; i++) x.fillRect((i * S) / cols - 3, 0, 6, S);
  for (let j = 0; j <= rows; j++) x.fillRect(0, (j * S) / rows - 2, S, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 掛け軸：椿の水墨と落款
export function kakejikuTexture(kind = 'tsubaki') {
  if (kind === 'shobu') return irisScroll();
  const W = 256, H = 768;
  const [c, x] = makeCanvas(W, H);
  x.fillStyle = '#3a3624';
  x.fillRect(0, 0, W, H);
  smoothNoise(x, W, H, 16, 0.25, 51, [90, 80, 40]);
  x.fillStyle = '#6f5a2c';
  x.fillRect(18, 90, W - 36, H - 200);
  x.fillStyle = '#d5c9a8';
  x.fillRect(28, 110, W - 56, H - 250);
  smoothNoise(x, W, H, 8, 0.12, 52, [120, 95, 50]);
  // 墨の枝
  x.strokeStyle = 'rgba(25,20,15,0.85)';
  x.lineCap = 'round';
  x.lineWidth = 6;
  x.beginPath();
  x.moveTo(60, 560);
  x.bezierCurveTo(90, 470, 150, 420, 170, 300);
  x.stroke();
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(130, 430);
  x.quadraticCurveTo(80, 380, 70, 320);
  x.stroke();
  x.fillStyle = 'rgba(25,30,25,0.75)';
  for (const [lx, ly, a] of [[165, 300, -0.6], [150, 360, 0.7], [72, 320, -1.2], [100, 400, 0.4], [180, 250, -0.2]]) {
    x.save();
    x.translate(lx, ly);
    x.rotate(a);
    x.beginPath();
    x.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  // 紅一輪
  x.fillStyle = 'rgba(160,20,30,0.9)';
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    x.beginPath();
    x.arc(120 + Math.cos(a) * 11, 345 + Math.sin(a) * 11, 13, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = '#d9b347';
  x.beginPath();
  x.arc(120, 345, 5, 0, Math.PI * 2);
  x.fill();
  // 落ちた花
  x.fillStyle = 'rgba(150,20,30,0.8)';
  x.beginPath();
  x.arc(170, 590, 10, 0, Math.PI * 2);
  x.fill();
  // 賛
  x.fillStyle = 'rgba(20,16,12,0.9)';
  x.font = `600 26px ${FONT}`;
  x.textAlign = 'center';
  ['一', '期', '一', '会'].forEach((ch, i) => x.fillText(ch, 196, 160 + i * 32));
  x.fillStyle = '#a3241f';
  x.fillRect(184, 300, 22, 22);
  // 軸棒
  x.fillStyle = '#1b130c';
  x.fillRect(0, 0, W, 10);
  x.fillRect(0, H - 14, W, 14);
  return toTexture(c);
}

// 花札（椿・菖蒲・桔梗）
const cardCache = {};
export function hanafudaCanvas(kind = 'tsubaki') {
  if (cardCache[kind]) return cardCache[kind];
  const W = 160, H = 256;
  const [c, x] = makeCanvas(W, H);
  x.fillStyle = '#1d0f0a';
  x.fillRect(0, 0, W, H);
  const bg = { tsubaki: '#efe3c4', shobu: '#e9e1c8', kikyo: '#1f2a44' }[kind];
  x.fillStyle = bg;
  x.fillRect(8, 8, W - 16, H - 16);
  const leaf = (lx, ly, a, rx = 24, ry = 11, col = '#21452c') => {
    x.save();
    x.translate(lx, ly);
    x.rotate(a);
    x.fillStyle = col;
    x.beginPath();
    x.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
  };
  if (kind === 'tsubaki') {
    x.fillStyle = '#2b2b2b';
    x.beginPath();
    x.moveTo(8, 190);
    x.quadraticCurveTo(80, 170, W - 8, 200);
    x.lineTo(W - 8, H - 8);
    x.lineTo(8, H - 8);
    x.fill();
    for (const l of [[60, 120, -0.8], [110, 150, 0.6], [45, 175, 0.2], [120, 95, -0.3]]) leaf(...l);
    x.fillStyle = '#c0141f';
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
      x.beginPath();
      x.arc(86 + Math.cos(a) * 18, 128 + Math.sin(a) * 18, 20, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#f3c63f';
    x.beginPath();
    x.arc(86, 128, 9, 0, Math.PI * 2);
    x.fill();
  } else if (kind === 'shobu') {
    // 水辺と八橋
    x.fillStyle = '#3d5f8a';
    x.fillRect(8, 196, W - 16, H - 204);
    x.fillStyle = '#5a3a1a';
    x.save();
    x.translate(80, 205);
    x.rotate(-0.25);
    x.fillRect(-70, -6, 140, 12);
    x.restore();
    // 剣のような葉
    x.fillStyle = '#2a5a2e';
    for (const [bx, h, lean] of [[40, 150, -0.1], [62, 175, 0.05], [100, 160, 0.12], [124, 140, 0.2], [80, 120, -0.05]]) {
      x.beginPath();
      x.moveTo(bx - 5, 200);
      x.quadraticCurveTo(bx + lean * 100, 200 - h * 0.6, bx + lean * 120, 200 - h);
      x.quadraticCurveTo(bx + lean * 80 + 6, 200 - h * 0.5, bx + 6, 200);
      x.fill();
    }
    // 花
    for (const [fx, fy] of [[64, 60], [104, 84]]) {
      x.fillStyle = '#5a2a8a';
      for (const a of [-1.9, -0.6, 0.6, 1.9]) leaf(fx + Math.cos(a - Math.PI / 2) * 10, fy + Math.sin(a - Math.PI / 2) * 10, a, 14, 7, '#5a2a8a');
      leaf(fx, fy + 8, Math.PI / 2, 12, 6, '#7a44b0');
      x.fillStyle = '#e8c840';
      x.fillRect(fx - 1.5, fy - 4, 3, 10);
    }
  } else {
    // 桔梗：夜空に星形の花
    x.fillStyle = '#c8b24a';
    x.beginPath();
    x.arc(118, 52, 18, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#1f2a44';
    x.beginPath();
    x.arc(110, 46, 16, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#2a5a2e';
    x.lineWidth = 3;
    for (const [sx, ex, ey] of [[50, 58, 120], [90, 96, 150], [120, 112, 110]]) {
      x.beginPath();
      x.moveTo(sx, H - 8);
      x.quadraticCurveTo(sx + 10, (H + ey) / 2, ex, ey);
      x.stroke();
    }
    const star = (cx, cy, r) => {
      x.fillStyle = '#6a52c8';
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.55 : r;
        x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      x.fill();
      x.fillStyle = '#e8e0f8';
      x.beginPath();
      x.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
      x.fill();
    };
    star(58, 112, 22);
    star(96, 144, 18);
    star(112, 104, 15);
  }
  x.fillStyle = kind === 'kikyo' ? '#e8dfcb' : '#111';
  x.font = `700 30px ${FONT}`;
  x.textAlign = 'center';
  const name = { tsubaki: ['椿'], shobu: ['菖', '蒲'], kikyo: ['桔', '梗'] }[kind];
  name.forEach((ch, i) => x.fillText(ch, 34, 50 + i * 32));
  x.fillStyle = 'rgba(80,50,20,0.18)';
  x.fillRect(8, 8, W - 16, H - 16);
  cardCache[kind] = c;
  return c;
}
export function hanafudaTexture(kind = 'tsubaki') {
  const t = toTexture(hanafudaCanvas(kind));
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// 枕時計の文字盤。draw(時, 分, 秒) で更新
export function clockFace() {
  const S = 256;
  const [c, x] = makeCanvas(S, S);
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const draw = (h, m, s) => {
    x.fillStyle = '#2b1a0f';
    x.fillRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2, R = 104;
    x.fillStyle = '#e4d8b9';
    x.beginPath();
    x.arc(cx, cy, R, 0, Math.PI * 2);
    x.fill();
    const g = x.createRadialGradient(cx, cy, 20, cx, cy, R);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(70,50,20,0.35)');
    x.fillStyle = g;
    x.fill();
    x.fillStyle = '#1a1209';
    x.font = `600 24px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      x.fillText(String(i), cx + Math.cos(a) * 80, cy + Math.sin(a) * 80);
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const l = i % 5 ? 4 : 9;
      x.fillRect(cx + Math.cos(a) * (R - 6 - l) - 1, cy + Math.sin(a) * (R - 6 - l) - 1, 2, 2);
    }
    const hand = (ang, len, w, col) => {
      x.strokeStyle = col;
      x.lineWidth = w;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(cx - Math.cos(ang) * 10, cy - Math.sin(ang) * 10);
      x.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      x.stroke();
    };
    const ha = (((h % 12) + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const ma = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    const sa = (s / 60) * Math.PI * 2 - Math.PI / 2;
    hand(ha, 50, 7, '#0d0905');
    hand(ma, 74, 4, '#0d0905');
    hand(sa, 82, 1.5, '#8a1a14');
    x.fillStyle = '#0d0905';
    x.beginPath();
    x.arc(cx, cy, 6, 0, Math.PI * 2);
    x.fill();
    t.needsUpdate = true;
  };
  draw(2, 0, 0);
  return { texture: t, draw };
}

// 布団の生地
export function futonTexture(kind = 'cover') {
  const S = 512;
  const [c, x] = makeCanvas(S, S);
  const r = rng(kind === 'cover' ? 61 : 62);
  if (kind === 'sheet') {
    x.fillStyle = '#d8d3c7';
    x.fillRect(0, 0, S, S);
    smoothNoise(x, S, S, 10, 0.2, 63, [130, 120, 100]);
    x.strokeStyle = 'rgba(150,140,120,0.25)';
    for (let i = 0; i < 40; i++) {
      x.beginPath();
      x.moveTo(r() * S, r() * S);
      x.bezierCurveTo(r() * S, r() * S, r() * S, r() * S, r() * S, r() * S);
      x.stroke();
    }
  } else {
    x.fillStyle = '#5a2a28';
    x.fillRect(0, 0, S, S);
    smoothNoise(x, S, S, 8, 0.3, 64, [30, 10, 10]);
    // 菊唐草風の小紋
    for (let yy = 16; yy < S; yy += 48) {
      for (let xx = (yy / 48) % 2 ? 24 : 0; xx < S + 24; xx += 48) {
        x.fillStyle = 'rgba(210,170,110,0.45)';
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * Math.PI * 2;
          x.beginPath();
          x.ellipse(xx + Math.cos(a) * 7, yy + Math.sin(a) * 7, 5, 2.5, a, 0, Math.PI * 2);
          x.fill();
        }
        x.fillStyle = 'rgba(40,15,12,0.9)';
        x.beginPath();
        x.arc(xx, yy, 3, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
  return toTexture(c);
}

// 浴衣（藍に白の麻の葉）
export function yukataTexture() {
  const S = 256;
  const [c, x] = makeCanvas(S, S);
  x.fillStyle = '#e4e0d4';
  x.fillRect(0, 0, S, S);
  x.strokeStyle = '#1f2f55';
  x.lineWidth = 2;
  const step = 32;
  for (let yy = 0; yy <= S; yy += step) {
    for (let xx = 0; xx <= S; xx += step) {
      x.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        x.moveTo(xx, yy);
        x.lineTo(xx + Math.cos(a) * step * 0.5, yy + Math.sin(a) * step * 0.5);
      }
      x.stroke();
    }
  }
  x.fillStyle = 'rgba(31,47,85,0.25)';
  x.fillRect(0, 0, S, S);
  return toTexture(c, { repeat: [2, 2] });
}

// 行灯・提灯の紙
export function lanternPaper({ ribs = false, kanji = null } = {}) {
  const W = 256, H = 256;
  const [c, x] = makeCanvas(W, H);
  const g = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, '#fff2d0');
  g.addColorStop(1, '#d9993e');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  smoothNoise(x, W, H, 12, 0.18, 71, [120, 60, 10]);
  x.fillStyle = 'rgba(60,25,5,0.55)';
  if (ribs) {
    for (let y = 0; y < H; y += 14) x.fillRect(0, y, W, 2);
  } else {
    x.fillRect(0, 0, 8, H);
    x.fillRect(W - 8, 0, 8, H);
    x.fillRect(0, H / 2 - 2, W, 4);
  }
  if (kanji) {
    x.fillStyle = 'rgba(30,10,5,0.85)';
    x.font = `700 110px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(kanji, W / 4, H / 2 + 4);
  }
  return toTexture(c);
}

// 天井板（杉の柾目）
export function ceilingTexture() {
  return woodMap('cedar', { repeat: [4, 1], rotate: true });
}

export function radialGlow(color = '255,150,60') {
  const S = 128;
  const [c, x] = makeCanvas(S, S);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, `rgba(${color},0.9)`);
  g.addColorStop(0.4, `rgba(${color},0.25)`);
  g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 菖蒲の間の掛け軸：菖蒲の水墨
function irisScroll() {
  const W = 256, H = 768;
  const [c, x] = makeCanvas(W, H);
  x.fillStyle = '#2c3430';
  x.fillRect(0, 0, W, H);
  smoothNoise(x, W, H, 16, 0.25, 81, [60, 80, 70]);
  x.fillStyle = '#5a5a3a';
  x.fillRect(18, 90, W - 36, H - 200);
  x.fillStyle = '#d2c8ac';
  x.fillRect(28, 110, W - 56, H - 250);
  smoothNoise(x, W, H, 8, 0.14, 82, [120, 95, 50]);
  x.fillStyle = 'rgba(30,40,30,0.8)';
  for (const [bx, h, lean] of [[90, 330, -0.05], [120, 380, 0.04], [150, 300, 0.1], [70, 260, -0.12]]) {
    x.beginPath();
    x.moveTo(bx - 4, 600);
    x.quadraticCurveTo(bx + lean * 300, 600 - h * 0.6, bx + lean * 360, 600 - h);
    x.quadraticCurveTo(bx + lean * 250 + 5, 600 - h * 0.5, bx + 5, 600);
    x.fill();
  }
  for (const [fx, fy] of [[118, 250], [150, 320]]) {
    x.fillStyle = 'rgba(70,40,110,0.85)';
    for (const a of [-1.9, -0.6, 0.6, 1.9]) {
      x.save();
      x.translate(fx + Math.cos(a - Math.PI / 2) * 14, fy + Math.sin(a - Math.PI / 2) * 14);
      x.rotate(a);
      x.beginPath();
      x.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
  }
  x.fillStyle = 'rgba(20,16,12,0.9)';
  x.font = `600 26px ${FONT}`;
  x.textAlign = 'center';
  ['水', '面', 'の', '月'].forEach((ch, i) => x.fillText(ch, 62, 160 + i * 32));
  x.fillStyle = '#a3241f';
  x.fillRect(50, 300, 22, 22);
  x.fillStyle = '#1b130c';
  x.fillRect(0, 0, W, 10);
  x.fillRect(0, H - 14, W, 14);
  return toTexture(c);
}

// 部屋札（廊下側の小さな木札）
export function namePlate(text) {
  const W = 128, H = 320;
  const [c, x] = makeCanvas(W, H);
  x.drawImage(woodCanvas('#8a6a48', 91, 64, 256, 0.8), 0, 0, W, H);
  x.strokeStyle = 'rgba(30,15,5,0.8)';
  x.lineWidth = 6;
  x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = 'rgba(20,10,5,0.92)';
  x.font = `700 ${text.length > 2 ? 64 : 80}px ${FONT}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const step = (H - 60) / text.length;
  [...text].forEach((ch, i) => x.fillText(ch, W / 2, 30 + step * (i + 0.5)));
  return toTexture(c);
}

// 帳場の障子。女将の影を映すかどうかを選べる
export function shojiSilhouette(withFigure) {
  const W = 512, H = 512;
  const [c, x] = makeCanvas(W, H);
  x.drawImage(shojiTexture().image, 0, 0);
  if (withFigure) {
    x.fillStyle = 'rgba(15,10,8,0.82)';
    const cx = 300;
    // 髷
    x.beginPath();
    x.ellipse(cx, 120, 34, 24, 0, 0, Math.PI * 2);
    x.fill();
    // 頭
    x.beginPath();
    x.ellipse(cx, 160, 30, 36, 0, 0, Math.PI * 2);
    x.fill();
    // 着物
    x.beginPath();
    x.moveTo(cx - 24, 190);
    x.quadraticCurveTo(cx - 80, 230, cx - 86, 330);
    x.lineTo(cx - 96, H);
    x.lineTo(cx + 96, H);
    x.lineTo(cx + 86, 330);
    x.quadraticCurveTo(cx + 80, 230, cx + 24, 190);
    x.fill();
  }
  return toTexture(c);
}

// 玄関の引き戸（格子に磨りガラス、外は霧の月明かり）
export function genkanDoorTexture() {
  const W = 256, H = 512;
  const [c, x] = makeCanvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#b8c4d8');
  g.addColorStop(1, '#6a7488');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  smoothNoise(x, W, H, 6, 0.3, 95, [40, 50, 70]);
  // 外に立つ木の影
  x.fillStyle = 'rgba(30,35,50,0.5)';
  x.fillRect(180, 0, 18, H);
  x.beginPath();
  x.ellipse(150, 90, 90, 60, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#24160c';
  x.fillRect(0, 0, W, 14);
  x.fillRect(0, H - 40, W, 40);
  x.fillRect(0, 0, 14, H);
  x.fillRect(W - 14, 0, 14, H);
  for (let i = 1; i < 4; i++) x.fillRect((i * W) / 4 - 3, 0, 6, H - 40);
  for (let j = 1; j < 8; j++) x.fillRect(0, (j * (H - 40)) / 8 - 3, W, 6);
  return toTexture(c);
}

// 着物（桔梗柄、娘のもの）
export function kimonoTexture() {
  const S = 256;
  const [c, x] = makeCanvas(S, S);
  x.fillStyle = '#3a2a5a';
  x.fillRect(0, 0, S, S);
  smoothNoise(x, S, S, 8, 0.3, 97, [20, 10, 40]);
  const r = rng(98);
  for (let i = 0; i < 26; i++) {
    const cx = r() * S, cy = r() * S, rad = 8 + r() * 8;
    x.fillStyle = 'rgba(200,190,240,0.7)';
    x.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const rr = k % 2 ? rad * 0.5 : rad;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.fill();
  }
  return toTexture(c, { repeat: [1.5, 2] });
}

// 手鞠
export function temariTexture() {
  const W = 256, H = 128;
  const [c, x] = makeCanvas(W, H);
  const cols = ['#a3241f', '#e8d8b0', '#2a4a7a', '#d9a030', '#3a6a3a'];
  for (let i = 0; i < 16; i++) {
    x.fillStyle = cols[i % cols.length];
    x.beginPath();
    x.moveTo((i * W) / 16, 0);
    x.lineTo(((i + 1) * W) / 16, 0);
    x.lineTo(((i + 0.5) * W) / 16 + 8, H / 2);
    x.lineTo(((i + 1) * W) / 16, H);
    x.lineTo((i * W) / 16, H);
    x.lineTo(((i + 0.5) * W) / 16 - 8, H / 2);
    x.fill();
  }
  x.fillStyle = 'rgba(0,0,0,0.25)';
  x.fillRect(0, H / 2 - 4, W, 8);
  return toTexture(c);
}

// 革の旅行鞄
export function leatherTexture() {
  const S = 256;
  const [c, x] = makeCanvas(S, S);
  x.fillStyle = '#4a2c18';
  x.fillRect(0, 0, S, S);
  smoothNoise(x, S, S, 10, 0.4, 99, [20, 10, 5]);
  smoothNoise(x, S, S, 64, 0.2, 100, [120, 80, 50]);
  speckle(x, S, S, 2000, 101, ['#2a180c', '#6a4a30'], 1.2);
  return toTexture(c);
}

// 紙切れ（日記・手紙）
export function paperScrap(lines, { seed = 111, tint = '#ddd2b4' } = {}) {
  const W = 256, H = 320;
  const [c, x] = makeCanvas(W, H);
  x.fillStyle = tint;
  x.beginPath();
  const r = rng(seed);
  x.moveTo(6, 4);
  for (let px = 6; px < W; px += 16) x.lineTo(px, 4 + r() * 8);
  x.lineTo(W - 4, H - 6);
  for (let px = W - 6; px > 0; px -= 16) x.lineTo(px, H - 4 - r() * 10);
  x.fill();
  smoothNoise(x, W, H, 6, 0.2, seed + 1, [120, 100, 60]);
  x.fillStyle = 'rgba(25,20,15,0.85)';
  x.font = `400 22px ${FONT}`;
  x.textAlign = 'center';
  lines.forEach((col, i) => {
    [...col].forEach((ch, j) => x.fillText(ch, W - 34 - i * 30, 40 + j * 24));
  });
  return toTexture(c);
}
