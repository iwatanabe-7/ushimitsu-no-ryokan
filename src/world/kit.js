// 建具や壁を組み立てる共通部品
import * as THREE from 'three';
import * as T from '../core/textures.js';

let root = null;
export function setRoot(scene) {
  root = scene;
}

export const std = (o) => new THREE.MeshStandardMaterial(o);

export function wallMat(w, h, tint = 0xb8a68a) {
  return std({ map: T.wallMap([Math.max(w, 0.3) / 1.3, Math.max(h, 0.3) / 1.3]), roughness: 0.96, color: tint });
}

// 共有の材質
export const M = {};
export function initMaterials() {
  M.pillar = std({ map: T.woodMap('pillar'), roughness: 0.55, color: 0xc0a080 });
  M.beam = std({ map: T.woodMap('pillar', { rotate: true, repeat: [1, 3] }), roughness: 0.55, color: 0xb09070 });
  M.dark = std({ map: T.woodMap('dark', { rotate: true, repeat: [1, 2] }), roughness: 0.45 });
  M.lacquer = std({ color: 0x0c0806, roughness: 0.28, metalness: 0.1 });
  M.toko = std({ map: T.woodMap('toko', { rotate: true, repeat: [1, 1.5] }), roughness: 0.3, color: 0x9a8070 });
  M.cedar = std({ map: T.woodMap('cedar', { rotate: true, repeat: [1, 4] }), roughness: 0.75, color: 0xa08a70 });
  M.oshiire = std({ map: T.woodMap('light', { rotate: true, repeat: [1, 2] }), roughness: 0.8, color: 0xb8a890 });
  M.table = std({ map: T.woodMap('toko', { rotate: true }), roughness: 0.22, color: 0x7a5a48 });
  M.pull = std({ color: 0x2a2014, roughness: 0.35, metalness: 0.6 });
  M.brass = std({ color: 0x8a6a30, roughness: 0.35, metalness: 0.8 });
  M.hit = new THREE.MeshBasicMaterial({ visible: false });
  M.tatami = [1, 2, 3].map((s) => T.tatamiTexture(s));
}

export function box(w, h, d, mat, x, y, z, { cast = true, receive = true, parent = root } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

export function slab(x0, x1, y0, y1, z0, z1, mat, opt) {
  return box(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, opt);
}

export function wall(x0, x1, y0, y1, z0, z1, tint) {
  const w = Math.max(x1 - x0, z1 - z0);
  return slab(x0, x1, y0, y1, z0, z1, wallMat(w, y1 - y0, tint));
}

export function post(x, z, h = 2.4, mat = M.pillar) {
  return box(0.11, h, 0.11, mat, x, h / 2, z);
}

// 畳を敷く。mats は [x0, x1, z0, z1] の並び
export function tatami(mats, tint = 0.62) {
  mats.forEach(([x0, x1, z0, z1], i) => {
    const vertical = x1 - x0 < z1 - z0;
    const t = M.tatami[i % 3];
    const m = box(0.896, 0.06, 1.796, std({
      map: t, bumpMap: t, bumpScale: 1.2, roughness: 0.82,
      color: new THREE.Color().setHSL(0.13, 0.15, tint + (i % 4) * 0.03),
    }), (x0 + x1) / 2, -0.03, (z0 + z1) / 2, { cast: false });
    if (!vertical) m.rotation.y = Math.PI / 2;
  });
}

// 竿縁天井と廻縁
export function ceiling(x0, x1, z0, z1, h = 2.4, wt = 0.12) {
  slab(x0 - wt, x1 + wt, h, h + 0.05, z0 - wt, z1 + wt, M.cedar);
  for (let z = z0 + 0.45; z < z1; z += 0.45) slab(x0, x1, h - 0.035, h, z - 0.015, z + 0.015, M.dark, { cast: false });
  slab(x0, x1, h - 0.05, h, z0, z0 + 0.05, M.dark, { cast: false });
  slab(x0, x1, h - 0.05, h, z1 - 0.05, z1, M.dark, { cast: false });
  slab(x0, x0 + 0.05, h - 0.05, h, z0, z1, M.dark, { cast: false });
  slab(x1 - 0.05, x1, h - 0.05, h, z0, z1, M.dark, { cast: false });
}

// 部屋を一周する長押
export function nageshi(x0, x1, z0, z1) {
  slab(x0, x1, 1.86, 1.96, z0, z0 + 0.05, M.beam);
  slab(x0, x1, 1.86, 1.96, z1 - 0.05, z1, M.beam);
  slab(x0, x0 + 0.05, 1.86, 1.96, z0, z1, M.beam);
  slab(x1 - 0.05, x1, 1.86, 1.96, z0, z1, M.beam);
}

// 襖一枚
export function fusumaPanel(tex, w = 0.9, h = 1.76, pullSide = 1) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h - 0.04, 0.018), std({ map: tex, roughness: 0.9, color: 0xc8bea6 }));
  paper.castShadow = paper.receiveShadow = true;
  g.add(paper);
  const f = 0.022;
  for (const [fw, fh, fx, fy] of [[w, f, 0, h / 2 - f / 2], [w, f, 0, -h / 2 + f / 2], [f, h, -w / 2 + f / 2, 0], [f, h, w / 2 - f / 2, 0]]) {
    box(fw, fh, 0.026, M.lacquer, fx, fy, 0, { parent: g });
  }
  for (const side of [1, -1]) {
    const hk = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 20), M.pull);
    hk.rotation.x = Math.PI / 2;
    hk.position.set(pullSide * (w / 2 - 0.09), -0.05, 0.004 * side);
    g.add(hk);
  }
  return g;
}

// 南の壁（z = zWall）にある二枚引きの襖。右の一枚を左へ引いて開ける
// 戻り値の open(t) に 0..1 を渡すと開き具合が変わる
export function slidingDoor({ cx, zWall, tex, texR, wt = 0.12, facing = 1 }) {
  const L = fusumaPanel(tex, 0.9, 1.76, 1);
  L.position.set(cx - 0.45, 0.9, zWall + 0.035 * facing);
  root.add(L);
  const R = fusumaPanel(texR || tex, 0.9, 1.76, -1);
  R.position.set(cx + 0.45, 0.9, zWall + 0.075 * facing);
  root.add(R);
  if (facing < 0) {
    L.rotation.y = R.rotation.y = Math.PI;
  }
  // 鴨居と敷居
  slab(cx - 0.9, cx + 0.9, 1.78, 1.86, Math.min(zWall, zWall + wt * facing) - 0.02, Math.max(zWall, zWall + wt * facing) + 0.02, M.beam);
  slab(cx - 0.9, cx + 0.9, 0, 0.02, Math.min(zWall, zWall + wt * facing) - 0.02, Math.max(zWall, zWall + wt * facing) + 0.02, M.beam, { cast: false });
  return {
    left: L,
    right: R,
    open(t) {
      R.position.x = cx + 0.45 - 0.8 * t;
    },
    // 開いたときの通り口（中心が通れる範囲）
    gapX: [cx + 0.1, cx + 0.9],
  };
}

// 調べられる物の当たり箱
export function hitBox(list, id, w, h, d, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.hit);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.userData.id = id;
  m.userData.enabled = true;
  root.add(m);
  list.push(m);
  return m;
}

// 行灯（明かりは呼び出し側で lamps に登録する）
export function andon(x, z, { parent = root } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  box(0.34, 0.04, 0.34, M.dark, 0, 0.02, 0, { parent: g });
  for (const [px, pz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) box(0.022, 0.82, 0.022, M.dark, px, 0.43, pz, { parent: g });
  box(0.34, 0.02, 0.34, M.dark, 0, 0.83, 0, { parent: g, cast: false });
  const tex = T.lanternPaper();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), std({
    map: tex, emissiveMap: tex, emissive: 0xffa04a, emissiveIntensity: 1.4, color: 0x332211, roughness: 0.9,
  }));
  paper.position.y = 0.56;
  g.add(paper);
  box(0.08, 0.02, 0.08, M.lacquer, 0, 0.32, 0, { parent: g });
  parent.add(g);
  return { group: g, paper };
}

// 吊り提灯
export function chochin(x, y, z, { kanji = '宿', scale = 1 } = {}) {
  const g = new THREE.Group();
  const tex = T.lanternPaper({ ribs: true, kanji });
  const paper = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 18), std({
    map: tex, emissiveMap: tex, emissive: 0xff8a3a, emissiveIntensity: 1.7, color: 0x331a0a, roughness: 0.9,
  }));
  paper.scale.set(1, 1.4, 1);
  g.add(paper);
  for (const y2 of [0.23, -0.23]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), M.lacquer);
    cap.position.y = y2;
    g.add(cap);
  }
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 4), M.lacquer);
  c.position.y = 0.38;
  g.add(c);
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  root.add(g);
  return { group: g, paper };
}

// 低い文机
export function fuzukue(x, z, ry = 0, mat = M.table) {
  const g = new THREE.Group();
  box(0.75, 0.03, 0.38, mat, 0, 0.3, 0, { parent: g });
  box(0.03, 0.29, 0.36, mat, -0.34, 0.145, 0, { parent: g });
  box(0.03, 0.29, 0.36, mat, 0.34, 0.145, 0, { parent: g });
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  root.add(g);
  return g;
}

// 6畳の客室の外殻。南の壁に廊下へ出る襖がある
// 返り値の door.open(t) で襖を開ける
export function roomShell({ x0, x1, z0, z1, doorCx, tex, texR, tint }) {
  wall(x0 - 0.12, x1 + 0.12, 0, 2.4, z0 - 0.12, z0, tint); // 北
  wall(x0 - 0.12, x0, 0, 2.4, z0, z1 + 0.12, tint); // 西
  wall(x1, x1 + 0.12, 0, 2.4, z0, z1 + 0.12, tint); // 東
  wall(x0, doorCx - 0.9, 0, 2.4, z1, z1 + 0.12, tint); // 南
  wall(doorCx + 0.9, x1, 0, 2.4, z1, z1 + 0.12, tint);
  wall(doorCx - 0.9, doorCx + 0.9, 1.8, 2.4, z1, z1 + 0.12, tint);
  ceiling(x0, x1, z0, z1);
  nageshi(x0, x1, z0, z1);
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [doorCx - 0.9, z1], [doorCx + 0.9, z1]]) post(px, pz);
  slab(x0, x1, 0, 0.04, z0, z0 + 0.02, M.dark, { cast: false });
  return slidingDoor({ cx: doorCx, zWall: z1, tex, texR });
}

// 部屋札を廊下側の壁に掛ける
export function plate(tex, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.015), [M.dark, M.dark, M.dark, M.dark, std({ map: tex, roughness: 0.6 }), M.dark]);
  m.position.set(x, y, z);
  m.castShadow = true;
  root.add(m);
  return m;
}

// 楕円の穴（池や湯船）の開いた地面。穴の内側には石の縁と底を付ける
export function groundWithHole({ x0, x1, z0, z1, y, mat, hole: [cx, cz, rx, rz], depth = 0.4, wallMat, bedMat }) {
  const shape = new THREE.Shape();
  shape.moveTo(x0, -z0);
  shape.lineTo(x1, -z0);
  shape.lineTo(x1, -z1);
  shape.lineTo(x0, -z1);
  shape.closePath();
  const h = new THREE.Path();
  h.absellipse(cx, -cz, rx, rz, 0, Math.PI * 2, true);
  shape.holes.push(h);
  const g = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), mat);
  g.rotation.x = -Math.PI / 2;
  g.position.y = y;
  g.receiveShadow = true;
  root.add(g);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, depth, 48, 1, true), wallMat);
  side.material.side = THREE.BackSide;
  side.scale.set(rx, 1, rz);
  side.position.set(cx, y - depth / 2, cz);
  side.receiveShadow = true;
  root.add(side);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 48), bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.scale.set(rx, rz, 1);
  bed.position.set(cx, y - depth, cz);
  bed.receiveShadow = true;
  root.add(bed);
  return g;
}
