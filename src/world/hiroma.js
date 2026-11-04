// 大広間（32畳）。客を待ったまま並ぶ膳、金屏風、上座の膳に「湯殿の鍵」
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { std, M, box, slab, wall, hitBox, tatami, ceiling, nageshi, post, andon } from './kit.js';
import { WT, R, HIROMA as Hr } from './layout.js';

export function buildHiroma(ctx) {
  const { scene, hits } = ctx;
  const mats = [];
  for (let c = 0; c < 8; c++) for (let r = 0; r < 4; r++) {
    const x0 = Hr.x0 + c * 0.9, z0 = Hr.z0 + r * 1.8;
    mats.push([x0, x0 + 0.9, z0, z0 + 1.8]);
  }
  tatami(mats, 0.58);
  const H2 = Hr.ceil;
  wall(Hr.x0 - WT, Hr.x0, 0, H2, Hr.z0 - WT, Hr.z1 + WT);
  wall(Hr.x1, Hr.x1 + WT, 0, H2, Hr.z0 - WT, Hr.z1 + WT);
  wall(Hr.x0, Hr.x1, 0, H2, Hr.z1, Hr.z1 + WT);
  wall(Hr.x0, Hr.x1, 2.4, H2, Hr.z0 - WT, Hr.z0); // 入口の上の小壁
  ceiling(Hr.x0, Hr.x1, Hr.z0, Hr.z1, H2);
  // 格天井の格子
  for (let x = Hr.x0 + 0.9; x < Hr.x1; x += 0.9) slab(x - 0.02, x + 0.02, H2 - 0.05, H2, Hr.z0, Hr.z1, M.dark, { cast: false });
  nageshi(Hr.x0, Hr.x1, Hr.z0, Hr.z1);
  for (let x = Hr.x0; x <= Hr.x1 + 0.01; x += 1.8) { post(x, Hr.z1, H2); }
  post(Hr.x0, Hr.z0, H2); post(Hr.x1, Hr.z0, H2);
  // 西と東の壁に並ぶ襖（開かない）
  const ft = T.fusumaTexture({ seed: 47, karakami: true });
  for (let z = Hr.z0 + 0.9; z < Hr.z1 - 0.8; z += 0.9) {
    for (const [x, ry] of [[Hr.x0 + 0.015, Math.PI / 2], [Hr.x1 - 0.015, -Math.PI / 2]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.74, 0.02), std({ map: ft, roughness: 0.9, color: 0xb0a690 }));
      p.position.set(x, 0.89, z);
      p.rotation.y = ry;
      p.receiveShadow = true;
      scene.add(p);
    }
  }

  // 舞台と金屏風
  const S = { x0: 12.5, x1: 16.14, z0: 9.7, y: 0.3 };
  slab(S.x0, S.x1, 0, S.y, S.z0, Hr.z1, std({ map: T.woodMap('toko', { rotate: true, repeat: [1, 3] }), roughness: 0.25, color: 0x8a6a50 }));
  slab(S.x0, S.x1, 0, S.y + 0.01, S.z0 - 0.04, S.z0 + 0.03, M.lacquer);
  const byobu = T.byobuTexture();
  const panels = 6, pw = (S.x1 - S.x0 - 0.4) / panels;
  for (let i = 0; i < panels; i++) {
    const t = byobu.clone();
    t.repeat.set(1 / panels, 1);
    t.offset.set(i / panels, 0);
    t.needsUpdate = true;
    const p = new THREE.Mesh(new THREE.BoxGeometry(pw, 1.5, 0.02), [M.lacquer, M.lacquer, M.lacquer, M.lacquer, std({ map: t, roughness: 0.35, metalness: 0.55 }), M.lacquer]);
    p.position.set(S.x0 + 0.2 + pw * (i + 0.5), S.y + 0.76, Hr.z1 - 0.35 + (i % 2 ? 0.06 : -0.06));
    p.rotation.y = (i % 2 ? 1 : -1) * 0.12;
    p.castShadow = p.receiveShadow = true;
    scene.add(p);
  }

  // 膳と座布団。左右に五つずつ向かい合い、上座に一つ
  const zenMat = std({ color: 0x3a0e0a, roughness: 0.3 });
  const bowlMat = std({ color: 0x1a0806, roughness: 0.25 });
  const lidMat = std({ color: 0x6a1a12, roughness: 0.3 });
  const cushion = std({ color: 0x4a2a3a, roughness: 0.95 });
  const zen = (x, z, ry) => {
    const g = new THREE.Group();
    box(0.38, 0.03, 0.38, zenMat, 0, 0.2, 0, { parent: g });
    for (const [lx, lz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) box(0.03, 0.2, 0.03, zenMat, lx, 0.1, lz, { parent: g });
    for (const [bx, bz, r] of [[-0.09, 0.08, 0.05], [0.09, 0.08, 0.05], [0, -0.09, 0.06]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, 0.05, 16), bowlMat);
      b.position.set(bx, 0.24, bz);
      g.add(b);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lidMat);
      lid.scale.y = 0.5;
      lid.position.set(bx, 0.265, bz);
      g.add(lid);
    }
    const hashi = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.006), std({ color: 0xd8c8a0 }));
    hashi.position.set(0, 0.22, 0.16);
    g.add(hashi);
    box(0.5, 0.06, 0.55, cushion, 0, 0.03, 0.42, { parent: g });
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    return g;
  };
  for (let i = 0; i < 5; i++) {
    const z = 5.0 + i * 0.95;
    zen(12.3, z, -Math.PI / 2);
    zen(16.3, z, Math.PI / 2);
  }
  const KAMIZA = new THREE.Vector3(14.32, 0, 9.0);
  zen(KAMIZA.x, KAMIZA.z, 0);
  // 上座の膳の上の鍵
  const key = new THREE.Group();
  const keyMat = std({ color: 0x8a7040, roughness: 0.3, metalness: 0.85, emissive: 0x2a1a08 });
  const ringK = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 16), keyMat);
  ringK.rotation.x = Math.PI / 2;
  key.add(ringK);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.012), keyMat);
  shaft.position.x = 0.07;
  key.add(shaft);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.09), std({ color: 0xd8ccb0, emissive: 0x2a2620, map: T.paperScrap(['湯殿'], { seed: 311 }) }));
  tag.position.set(-0.07, 0, 0);
  key.add(tag);
  key.position.set(KAMIZA.x, 0.22, KAMIZA.z - 0.05);
  key.rotation.y = 0.4;
  scene.add(key);

  // 灯り（四隅の行灯のうち二つだけ点いている）
  const lamps = [];
  for (const [x, z, lit] of [[Hr.x0 + 0.4, Hr.z0 + 0.5, true], [Hr.x1 - 0.4, Hr.z1 - 0.5, true], [Hr.x0 + 0.4, Hr.z1 - 0.5, true], [Hr.x1 - 0.4, Hr.z0 + 0.5, true]]) {
    const a = andon(x, z);
    if (lit) lamps.push(ctx.addLamp({ pos: new THREE.Vector3(x, 0.5, z), color: 0xff9447, base: 4.2, paper: a.paper.material, paperBase: 1.4, kind: 'andon', zone: 'hiroma' }));
    else a.paper.material.emissiveIntensity = 0;
    ctx.block.push({ c: [x, z, 0.17 + R] });
  }

  // 舞台の上の燭台
  for (const x of [S.x0 + 0.3, S.x1 - 0.3]) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.9, 10), M.lacquer);
    stand.position.set(x, S.y + 0.45, S.z0 + 0.3);
    scene.add(stand);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
    flame.scale.set(1, 2.4, 1);
    flame.position.set(x, S.y + 0.97, S.z0 + 0.3);
    scene.add(flame);
    lamps.push(ctx.addLamp({ pos: new THREE.Vector3(x, S.y + 1.0, S.z0 + 0.3), color: 0xffa04a, base: 2.6, paper: new THREE.MeshStandardMaterial(), paperBase: 1, kind: 'candle', zone: 'hiroma', flame }));
  }

  const H = {
    kamiza: hitBox(hits, 'kamiza', 0.5, 0.3, 0.5, KAMIZA.x, 0.22, KAMIZA.z),
    zenL: hitBox(hits, 'zen', 0.5, 0.4, 4.4, 12.3, 0.2, 6.9),
    zenR: hitBox(hits, 'zen', 0.5, 0.4, 4.4, 16.3, 0.2, 6.9),
    byobu: hitBox(hits, 'byobu', 3.6, 1.6, 0.4, 14.32, S.y + 0.76, Hr.z1 - 0.35),
  };

  ctx.walk.push({ r: [Hr.x0 + R, Hr.x1 - R, Hr.z0 + R, Hr.z1 - R] });
  ctx.block.push({ r: [S.x0 - R, S.x1 + R, S.z0 - R, Hr.z1] });
  ctx.block.push({ r: [11.9 - R * 0.5, 12.6 + R * 0.5, 4.5, 9.4] });
  ctx.block.push({ r: [16.0 - R * 0.5, 16.7 + R * 0.5, 4.5, 9.4] });
  ctx.block.push({ r: [KAMIZA.x - 0.3, KAMIZA.x + 0.3, KAMIZA.z - 0.3, KAMIZA.z + 0.8] });
  ctx.zones.push({ name: 'hiroma', r: [Hr.x0, Hr.x1, Hr.z0 - 0.06, Hr.z1] });

  return { H, key, lamps, stagePos: new THREE.Vector3(14.32, 1.2, 10.3) };
}
