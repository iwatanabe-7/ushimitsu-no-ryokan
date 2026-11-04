// 大浴場：脱衣所と露天の岩風呂。菖蒲湯の底に「菖蒲の札」が沈んでいる
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { std, M, box, slab, wall, hitBox, andon, chochin, ceiling, post, groundWithHole } from './kit.js';
import { WT, R, DATSUI as D, ROTEN as Rt, WATARI } from './layout.js';
import { cardMaterials } from './tsubaki.js';

export function buildBath(ctx) {
  const { scene, hits } = ctx;
  // ---------------------------------------------------------- 脱衣所
  const floorTex = T.floorBoardsTexture();
  floorTex.repeat.set(1.2, 1.2);
  slab(D.x0, D.x1, -0.06, 0, D.z0, D.z1, std({ map: floorTex, roughness: 0.4, color: 0xa08868 }), { cast: false });
  const [d0, d1] = D.door;
  // 西の壁（渡り廊下側）に板戸
  wall(D.x0 - WT, D.x0, 0, 2.4, D.z0 - WT, d0);
  wall(D.x0 - WT, D.x0, 0, 2.4, d1, D.z1 + WT);
  wall(D.x0 - WT, D.x0, 1.8, 2.4, d0, d1);
  wall(D.x1, D.x1 + WT, 0, 2.4, D.z0 - WT, D.z1 + WT);
  wall(D.x0, D.x1, 0, 2.4, D.z1, D.z1 + WT);
  // 北の壁、露天への口
  const [o0, o1] = D.out;
  wall(D.x0, o0, 0, 2.4, D.z0 - WT, D.z0);
  wall(o1, D.x1, 0, 2.4, D.z0 - WT, D.z0);
  wall(o0, o1, 1.85, 2.4, D.z0 - WT, D.z0);
  ceiling(D.x0, D.x1, D.z0, D.z1);
  post(D.x0, d0); post(D.x0, d1); post(o0, D.z0); post(o1, D.z0);
  // 板戸（渡り廊下の突き当たり）
  const plank = std({ map: T.woodMap('pillar', { repeat: [1, 1] }), roughness: 0.55, color: 0x9a7a58 });
  const door = new THREE.Group();
  box(0.04, 1.78, d1 - d0, plank, 0, 0.9, 0, { parent: door });
  for (let k = 0; k < 4; k++) box(0.05, 0.03, d1 - d0, M.dark, 0.0, 0.3 + k * 0.42, 0, { parent: door });
  box(0.06, 0.12, 0.04, M.brass, -0.03, 1.0, (d1 - d0) / 2 - 0.12, { parent: door });
  door.position.set(D.x0 - 0.06, 0, (d0 + d1) / 2);
  scene.add(door);
  // 湯の暖簾
  const noren = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6, 1, 6), std({ color: 0x3a1a1a, roughness: 0.95, side: THREE.DoubleSide, map: T.paperScrap(['ゆ'], { seed: 301, tint: '#5a1a1a' }) }));
  noren.position.set((o0 + o1) / 2, 1.55, D.z0 + 0.02);
  scene.add(noren);
  ctx.sway.push({ mesh: noren, seed: 9.3 });
  // 棚と脱衣籠
  const shelf = std({ map: T.woodMap('light', { rotate: true }), roughness: 0.6, color: 0x9a8060 });
  slab(D.x1 - 0.45, D.x1, 0, 1.6, 1.4, 4.2, shelf);
  const basket = std({ color: 0x8a6a3a, roughness: 0.85 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    if ((r * 4 + c) % 5 === 2) continue;
    box(0.36, 0.2, 0.5, basket, D.x1 - 0.25, 0.2 + r * 0.5, 1.75 + c * 0.65);
  }
  // 一つだけ、畳んだ浴衣が入っている籠
  box(0.3, 0.06, 0.4, std({ map: T.yukataTexture(), roughness: 0.95 }), D.x1 - 0.25, 0.93, 2.4);
  box(1.8, 0.42, 0.4, shelf, 19.9, 0.21, D.z1 - 0.25); // 腰掛け（南の壁ぎわ。入口をふさがない）
  const a = andon(D.x0 + 0.35, D.z0 + 0.35);
  ctx.addLamp({ pos: new THREE.Vector3(D.x0 + 0.35, 0.5, D.z0 + 0.35), color: 0xff9447, base: 2.6, paper: a.paper.material, paperBase: 1.3, kind: 'andon', zone: 'datsui' });

  // ---------------------------------------------------------- 露天風呂
  const stoneTex = T.wallMap([0.6, 0.6]);
  const stoneMat = std({ map: stoneTex, color: 0x74726c, roughness: 0.75 });
  const [hx, hz, hrx, hrz] = Rt.pool;
  groundWithHole({
    x0: Rt.x0, x1: Rt.x1, z0: Rt.z0, z1: Rt.z1, y: -0.04, hole: [hx, hz, hrx, hrz], depth: 0.55, mat: stoneMat,
    wallMat: std({ color: 0x4a4842, roughness: 0.8 }), bedMat: std({ color: 0x3a3a34, roughness: 0.9 }),
  });
  // 目隠しの板塀
  const fence = std({ map: T.woodMap('dark', { repeat: [6, 1], rotate: false }), roughness: 0.8, color: 0x6a5a48 });
  slab(Rt.x0, Rt.x1, -0.1, 2.1, Rt.z0 - 0.08, Rt.z0, fence);
  slab(Rt.x1, Rt.x1 + 0.08, -0.1, 2.1, Rt.z0, Rt.z1, fence);
  slab(Rt.x0 - 0.08, Rt.x0, -0.1, 2.1, Rt.z0, Rt.z1, fence);
  slab(D.x1 + WT, Rt.x1, -0.1, 2.1, Rt.z1, Rt.z1 + 0.08, fence);
  // 岩風呂
  const [px, pz, rx, rz] = Rt.pool;
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: 0x2c3e40, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.72 }));
  water.rotation.x = -Math.PI / 2;
  water.scale.set(rx, rz, 1);
  water.position.set(px, -0.2, pz);
  scene.add(water);
  const rockMat = std({ color: 0x4e4c46, roughness: 0.85, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const ang = (i / 26) * Math.PI * 2;
    const s = 0.22 + ((i * 5) % 4) * 0.06;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), rockMat);
    m.scale.set(1.2, 0.75, 1);
    m.rotation.y = i * 1.7;
    m.position.set(px + Math.cos(ang) * (rx + 0.1), -0.12 + s * 0.3, pz + Math.sin(ang) * (rz + 0.1));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  // 浮かぶ菖蒲の葉
  const leaf = std({ color: 0x2e5a2a, roughness: 0.5 });
  const leaves = [];
  for (let i = 0; i < 14; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.035), leaf);
    l.position.set(px + Math.sin(i * 2.3) * rx * 0.6, -0.195, pz + Math.cos(i * 1.7) * rz * 0.6);
    l.rotation.y = i * 0.9;
    scene.add(l);
    leaves.push(l);
  }
  // 湯の底の札（縁の近く）
  const CARD = new THREE.Vector3(px - rx + 0.45, -0.3, pz + 0.15);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.16), cardMaterials('shobu'));
  card.position.copy(CARD);
  card.rotation.y = 0.5;
  scene.add(card);
  // 筧（竹の樋）から落ちる湯
  const kakehi = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 10), std({ color: 0x7a7a40, roughness: 0.4 }));
  kakehi.rotation.z = Math.PI / 2 - 0.15;
  kakehi.position.set(px + rx + 0.5, 0.75, pz - 0.4);
  kakehi.castShadow = true;
  scene.add(kakehi);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.95, 8), new THREE.MeshStandardMaterial({ color: 0xc8d8e0, transparent: true, opacity: 0.5, roughness: 0.1 }));
  stream.position.set(px + rx - 0.06, 0.25, pz - 0.4);
  scene.add(stream);
  // 湯気
  const steamTex = T.radialGlow('230,230,235');
  const steam = [];
  for (let i = 0; i < 26; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, fog: true }));
    sp.userData = { seed: Math.random() * 10, ox: px + (Math.random() - 0.5) * rx * 1.6, oz: pz + (Math.random() - 0.5) * rz * 1.4 };
    scene.add(sp);
    steam.push(sp);
  }
  // 灯り
  const lan = chochin(Rt.x0 + 0.5, 1.7, Rt.z1 - 0.5, { kanji: '湯' });
  const lanPost = box(0.06, 1.55, 0.06, M.dark, Rt.x0 + 0.5, 0.7, Rt.z1 - 0.5);
  lanPost.castShadow = true;
  ctx.addLamp({ pos: new THREE.Vector3(Rt.x0 + 0.5, 1.65, Rt.z1 - 0.5), color: 0xff8a40, base: 2.8, distance: 7, paper: lan.paper.material, paperBase: 1.6, kind: 'lantern', zone: 'roten' });

  const H = {
    yudonoDoor: hitBox(hits, 'yudonoDoor', 0.1, 1.8, d1 - d0, D.x0 - 0.08, 0.9, (d0 + d1) / 2),
    kago: hitBox(hits, 'kago', 0.5, 1.6, 2.8, D.x1 - 0.25, 0.8, 2.8),
    bathCard: hitBox(hits, 'bathCard', 0.6, 0.3, 0.6, CARD.x, -0.1, CARD.z),
    pool: hitBox(hits, 'pool', 0.8, 0.2, 0.8, px + 0.9, -0.15, pz - 0.5),
    kakehi: hitBox(hits, 'kakehi', 1.2, 0.3, 0.3, px + rx + 0.5, 0.7, pz - 0.4),
  };

  ctx.walk.push({ r: [WATARI.x1 - 0.4, D.x0 + 0.5, d0 + R, d1 - R], when: () => ctx.state.yudonoAnim > 0.85 });
  ctx.walk.push({ r: [D.x0 + R, D.x1 - R, D.z0 + R, D.z1 - R] });
  ctx.walk.push({ r: [o0 + R, o1 - R, D.z0 - 0.5, D.z0 + 0.5] });
  ctx.walk.push({ r: [Rt.x0 + R, Rt.x1 - R, Rt.z0 + R, Rt.z1 - R] });
  ctx.block.push({ r: [D.x1 - 0.45 - R, D.x1, 1.4 - R, 4.2 + R] });
  ctx.block.push({ r: [19.0 - R, 20.8 + R, D.z1 - 0.45 - R, D.z1] });
  ctx.block.push({ c: [D.x0 + 0.35, D.z0 + 0.35, 0.17 + R] });
  ctx.block.push({ c: [Rt.x0 + 0.5, Rt.z1 - 0.5, 0.05 + R] });
  // 湯船の中は腰まで浸かる深さ。縁の石はまたいで入る
  ctx.floors.push({ e: [px, pz, rx - 0.05, rz - 0.05], y: -0.55 });
  ctx.floors.push({ r: [Rt.x0, Rt.x1, Rt.z0, Rt.z1], y: -0.05 });
  ctx.zones.push({ name: 'datsui', r: [D.x0 - 0.06, D.x1, D.z0, D.z1] });
  ctx.zones.push({ name: 'roten', r: [Rt.x0, Rt.x1, Rt.z0, D.z0 - 0.06] });

  return {
    H, door, card, leaves, steam, water,
    doorPos: new THREE.Vector3(D.x0, 1.0, (d0 + d1) / 2),
    poolPos: new THREE.Vector3(px, 0, pz),
    open(t) {
      door.position.z = (d0 + d1) / 2 - (d1 - d0 + 0.05) * t;
    },
    update(t, show) {
      for (const sp of steam) {
        const u = sp.userData;
        const life = ((t * 0.12 + u.seed) % 1);
        sp.position.set(u.ox + Math.sin(t * 0.3 + u.seed) * 0.2, -0.1 + life * 1.8, u.oz);
        sp.scale.setScalar(0.6 + life * 1.4);
        sp.material.opacity = show ? Math.sin(life * Math.PI) * 0.16 : 0;
      }
      leaves.forEach((l, i) => (l.position.y = -0.195 + Math.sin(t * 0.8 + i) * 0.006));
    },
  };
}
