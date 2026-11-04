// 1 椿の間（8畳・自室）
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { std, M, box, slab, wall, post, tatami, ceiling, nageshi, slidingDoor, hitBox, andon, fusumaPanel } from './kit.js';
import { WT, CEIL, R } from './layout.js';

export function buildTsubaki(ctx) {
  const { scene, hits } = ctx;
  const HW = 1.8;

  tatami([
    [-1.8, -0.9, -1.8, 0], [-0.9, 0.9, -1.8, -0.9], [-0.9, 0.9, -0.9, 0], [0.9, 1.8, -1.8, 0],
    [-1.8, -0.9, 0, 1.8], [-0.9, 0.9, 0, 0.9], [-0.9, 0.9, 0.9, 1.8], [0.9, 1.8, 0, 1.8],
  ]);

  // 壁：北（床の間）
  wall(-0.2, HW + WT, 0, CEIL, -HW - WT, -HW);
  wall(-HW, -0.2, 1.95, CEIL, -HW - 0.06, -HW);
  wall(-HW, -0.2, 0, CEIL, -2.45 - WT, -2.45);
  wall(-0.2, -0.2 + WT, 0, CEIL, -2.45, -HW);
  slab(-HW, -0.2, 2.3, 2.36, -2.45, -HW, std({ map: T.woodMap('cedar', { rotate: true }), roughness: 0.7 }));
  slab(-HW, -0.2, 0, 0.13, -2.45, -HW, M.toko);
  slab(-HW, -0.2, 0, 0.14, -1.86, -HW + 0.02, M.lacquer);
  // 東（押入れ）
  wall(HW, HW + WT, 0, CEIL, -HW - WT, -0.9);
  wall(HW, HW + WT, 0, CEIL, 0.9, HW + WT);
  wall(HW, HW + WT, 1.8, CEIL, -0.9, 0.9);
  // 南（廊下への襖）
  wall(-HW - WT, -0.9, 0, CEIL, HW, HW + WT);
  wall(0.9, HW + WT, 0, CEIL, HW, HW + WT);
  wall(-0.9, 0.9, 1.8, CEIL, HW, HW + WT);
  // 西（障子窓）
  wall(-HW - WT, -HW, 0, CEIL, -2.45 - WT, -0.9);
  wall(-HW - WT, -HW, 0, CEIL, 0.9, HW + WT);
  wall(-HW - WT, -HW, 0, 0.75, -0.9, 0.9);
  wall(-HW - WT, -HW, 1.85, CEIL, -0.9, 0.9);

  // 押入れの中
  slab(2.6, 2.7, 0, 1.8, -0.9, 0.9, M.oshiire);
  slab(HW, 2.6, 0, 1.8, -1.0, -0.9, M.oshiire);
  slab(HW, 2.6, 0, 1.8, 0.9, 1.0, M.oshiire);
  slab(HW, 2.7, 1.8, 1.86, -1.0, 1.0, M.oshiire);
  slab(HW, 2.6, 0, 0.05, -0.9, 0.9, M.oshiire);
  slab(HW, 2.6, 0.74, 0.78, -0.9, 0.9, M.oshiire);
  slab(HW + 0.1, HW + 0.16, 0.72, 0.8, -0.9, 0.9, M.pillar);

  ceiling(-HW, HW, -HW, HW);
  post(HW, -HW); post(HW, HW); post(-HW, HW);
  post(0.9, HW); post(-0.9, HW);
  post(HW, -0.9); post(HW, 0.9);
  post(-HW, -0.9); post(-HW, 0.9);
  post(-HW, -2.45);
  // 床柱
  const toko = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.068, CEIL, 14, 8), std({ map: T.woodMap('light'), roughness: 0.6, color: 0xd0b090 }));
  toko.position.set(-0.2, CEIL / 2, -HW);
  toko.castShadow = toko.receiveShadow = true;
  {
    const p = toko.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const s = 1 + Math.sin(p.getY(i) * 7 + Math.atan2(p.getZ(i), p.getX(i)) * 3) * 0.05;
      p.setX(i, p.getX(i) * s);
      p.setZ(i, p.getZ(i) * s);
    }
    toko.geometry.computeVertexNormals();
  }
  scene.add(toko);
  nageshi(-HW, HW, -HW, HW);
  slab(HW - 0.02, HW + WT, 1.78, 1.86, -0.9, 0.9, M.beam);
  slab(-HW - WT, -HW + 0.02, 1.8, 1.85, -0.9, 0.9, M.beam);
  slab(-HW - WT, -HW + 0.02, 0.72, 0.75, -0.9, 0.9, M.beam);
  slab(-HW, HW, 0, 0.04, -HW, -HW + 0.02, M.dark, { cast: false });
  slab(-HW, -0.9, 0, 0.04, HW - 0.02, HW, M.dark, { cast: false });
  slab(0.9, HW, 0, 0.04, HW - 0.02, HW, M.dark, { cast: false });

  // 襖（廊下側）
  const doorTex = T.fusumaTexture({ seed: 31, camellia: true });
  const doorTexR = doorTex.clone();
  doorTexR.repeat.x = -1;
  doorTexR.offset.x = 1;
  const door = slidingDoor({ cx: 0, zWall: HW, tex: doorTex, texR: doorTexR });

  // 押入れの襖
  const oshTex = T.fusumaTexture({ seed: 33, karakami: true });
  const oshN = fusumaPanel(oshTex, 0.9, 1.76, -1);
  oshN.rotation.y = Math.PI / 2;
  oshN.position.set(HW + 0.075, 0.9, -0.45);
  scene.add(oshN);
  const oshS = fusumaPanel(oshTex, 0.9, 1.76, 1);
  oshS.rotation.y = Math.PI / 2;
  oshS.position.set(HW + 0.035, 0.9, 0.45);
  scene.add(oshS);

  // 障子窓
  const shojiTex = T.shojiTexture();
  for (const z of [-0.45, 0.45]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), std({
      map: shojiTex, emissiveMap: shojiTex, emissive: 0x5d6b88, emissiveIntensity: 0.42, roughness: 0.9, side: THREE.DoubleSide,
    }));
    m.rotation.y = Math.PI / 2;
    m.position.set(-HW - 0.06, 1.3, z);
    m.receiveShadow = true;
    scene.add(m);
  }

  // 床の間
  const kakejiku = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 1.32), std({ map: T.kakejikuTexture(), roughness: 0.85 }));
  kakejiku.position.set(-1.0, 1.32, -2.44);
  kakejiku.receiveShadow = true;
  scene.add(kakejiku);
  for (const y of [1.99, 0.655]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, y > 1 ? 0.46 : 0.52, 10), M.lacquer);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(-1.0, y, -2.43);
    rod.castShadow = true;
    scene.add(rod);
  }
  scene.add(camelliaVase(-0.55, 0.13, -2.18));

  const card = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.16), cardMaterials('tsubaki'));
  card.position.set(-1.3, 0.132, -2.05);
  card.rotation.y = 0.35;
  card.castShadow = card.receiveShadow = true;
  scene.add(card);

  // 布団・枕
  const sheet = std({ map: T.futonTexture('sheet'), roughness: 0.95 });
  const cover = std({ map: T.futonTexture('cover'), roughness: 0.92 });
  box(1.0, 0.09, 2.0, sheet, 0.25, 0.045, -0.2);
  {
    const g = new THREE.BoxGeometry(1.1, 0.12, 1.2, 10, 1, 10);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 0) {
        const x = p.getX(i), z = p.getZ(i);
        p.setY(i, p.getY(i) + Math.sin(x * 6 + z * 4) * 0.02 + Math.sin(z * 9) * 0.012 + (z > 0.3 ? -0.02 : 0));
      }
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, cover);
    m.position.set(0.27, 0.15, 0.24);
    m.rotation.y = 0.04;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.1, 16), cover);
    roll.rotation.z = Math.PI / 2;
    roll.rotation.y = 0.04;
    roll.position.set(0.25, 0.18, -0.36);
    roll.castShadow = roll.receiveShadow = true;
    scene.add(roll);
  }
  const pillow = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 14), std({ color: 0xd9d2c4, roughness: 0.95 }));
  pillow.rotation.z = Math.PI / 2;
  pillow.scale.set(0.6, 1, 1);
  pillow.position.set(0.25, 0.15, -0.98);
  pillow.castShadow = pillow.receiveShadow = true;
  scene.add(pillow);

  // 行灯
  const ANDON = new THREE.Vector3(1.22, 0, -1.32);
  const a = andon(ANDON.x, ANDON.z);
  ctx.addLamp({ pos: new THREE.Vector3(ANDON.x, 0.5, ANDON.z), color: 0xff9447, base: 3.6, paper: a.paper.material, paperBase: 1.4, kind: 'andon', zone: 'tsubaki' });

  // 枕時計
  const CLOCK = new THREE.Vector3(0.8, 0, -1.08);
  const clock = new THREE.Group();
  clock.position.copy(CLOCK);
  clock.rotation.y = -0.45;
  box(0.16, 0.2, 0.08, std({ map: T.woodMap('dark'), roughness: 0.35, color: 0x8a6a50 }), 0, 0.1, 0, { parent: clock });
  const face = T.clockFace();
  const faceMesh = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), std({ map: face.texture, emissiveMap: face.texture, emissive: 0x2a2014, emissiveIntensity: 0.5, roughness: 0.25 }));
  faceMesh.position.set(0, 0.11, 0.041);
  clock.add(faceMesh);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.062, 32), std({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.2 }));
  glass.position.set(0, 0.11, 0.043);
  clock.add(glass);
  scene.add(clock);
  ctx.clockFaces.push(face);
  ctx.tickSources.push({ pos: new THREE.Vector3(CLOCK.x, 0.12, CLOCK.z), kind: 'small' });

  // 座卓
  const TABLE = { x: -1.0, z: 1.0 };
  box(0.9, 0.035, 0.62, M.table, TABLE.x, 0.33, TABLE.z);
  for (const [dx, dz] of [[-0.4, -0.26], [0.4, -0.26], [-0.4, 0.26], [0.4, 0.26]]) box(0.05, 0.31, 0.05, M.table, TABLE.x + dx, 0.155, TABLE.z + dz);
  const cupMat = std({ color: 0x5a4a3a, roughness: 0.35 });
  for (const [dx, dz] of [[-0.18, -0.1], [0.12, 0.12]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 18), cupMat);
    c.position.set(TABLE.x + dx, 0.388, TABLE.z + dz);
    c.castShadow = true;
    scene.add(c);
  }
  {
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), std({ color: 0x1e1a16, roughness: 0.3 }));
    pot.scale.set(1, 0.8, 1);
    pot.position.set(TABLE.x + 0.25, 0.4, TABLE.z - 0.12);
    pot.castShadow = true;
    scene.add(pot);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.08, 8), pot.material);
    sp.position.set(TABLE.x + 0.33, 0.42, TABLE.z - 0.12);
    sp.rotation.z = -1.0;
    scene.add(sp);
  }
  box(0.55, 0.06, 0.58, std({ color: 0x3a2030, roughness: 0.95 }), TABLE.x, 0.03, TABLE.z - 0.58);

  // 押入れの中身
  const yukata = new THREE.Group();
  box(0.42, 0.06, 0.34, std({ map: T.yukataTexture(), roughness: 0.95 }), 0, 0, 0, { parent: yukata });
  box(0.42, 0.012, 0.06, std({ color: 0x5a1a1a, roughness: 0.8 }), 0, 0.035, 0.04, { parent: yukata });
  yukata.position.set(2.15, 0.81, 0.5);
  yukata.children[0].material.emissiveMap = yukata.children[0].material.map;
  yukata.children[0].material.emissive.setHex(0xffffff);
  yukata.children[0].material.emissiveIntensity = 0.12;
  // 押入れを開けると、中がほんのり見える（部屋の行灯の明かりが回り込む想定）
  const oshiireLamp = ctx.addLamp({ pos: new THREE.Vector3(1.95, 1.3, 0.35), color: 0xffb070, base: 1.5, distance: 2.6, kind: 'fill', zone: 'tsubaki' });
  oshiireLamp.level = 0;
  scene.add(yukata);
  for (let i = 0; i < 4; i++) box(0.7, 0.13, 0.75, std({ color: i % 2 ? 0xbfb6a6 : 0x6a4a40, roughness: 0.95 }), 2.2, 0.12 + i * 0.135, 0.45 - (i % 2) * 0.02);
  for (let i = 0; i < 3; i++) box(0.7, 0.14, 0.75, std({ color: 0xa89e8c, roughness: 0.95 }), 2.2, 0.85 + i * 0.145, -0.45);

  // 月光（障子越し）。部屋は動かないので影は必要なときだけ描き直す
  const moon = new THREE.SpotLight(0xa8bcff, 90, 0, 0.42, 0.55, 2);
  moon.position.set(-5.2, 3.3, 0.35);
  moon.target.position.set(0.2, 0, 0.15);
  moon.map = T.latticeLightMap();
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 12;
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.02;
  moon.shadow.autoUpdate = false;
  moon.shadow.needsUpdate = true;
  scene.add(moon, moon.target);

  // 襖の下から漏れる提灯の明かり
  const leakStrip = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.014), new THREE.MeshBasicMaterial({ color: 0xffa050 }));
  leakStrip.position.set(0, 0.025, HW + 0.02);
  scene.add(leakStrip);
  const leakGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), new THREE.MeshBasicMaterial({
    map: T.radialGlow(), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  leakGlow.rotation.x = -Math.PI / 2;
  leakGlow.position.set(0, 0.004, HW - 0.25);
  scene.add(leakGlow);
  const leakLight = new THREE.PointLight(0xff8a3a, 0.35, 2.4, 2);
  leakLight.position.set(0, 0.06, HW - 0.1);
  scene.add(leakLight);

  // 調べられる物
  const H = {
    clock: hitBox(hits, 'clock', 0.3, 0.3, 0.3, CLOCK.x, 0.12, CLOCK.z),
    andon: hitBox(hits, 'andon', 0.42, 0.9, 0.42, ANDON.x, 0.45, ANDON.z),
    futon: hitBox(hits, 'futon', 0.95, 0.2, 1.7, 0.25, 0.1, -0.05),
    table: hitBox(hits, 'table', 0.95, 0.45, 0.7, TABLE.x, 0.22, TABLE.z),
    door: hitBox(hits, 'door', 1.8, 1.8, 0.1, 0, 0.9, HW + 0.04),
    oshiire: hitBox(hits, 'oshiire', 0.1, 1.8, 1.8, HW + 0.04, 0.9, 0),
    oshiireInner: hitBox(hits, 'oshiireInner', 0.6, 0.7, 0.8, 2.15, 0.35, 0.5),
    yukata: hitBox(hits, 'yukata', 0.5, 0.25, 0.45, 2.1, 0.85, 0.5),
    kakejiku: hitBox(hits, 'kakejiku', 0.5, 1.35, 0.1, -1.0, 1.32, -2.42),
    vase: hitBox(hits, 'vase', 0.22, 0.75, 0.22, -0.55, 0.45, -2.18),
    card: hitBox(hits, 'card', 0.28, 0.12, 0.3, -1.3, 0.16, -2.05),
    shoji: hitBox(hits, 'shoji', 0.1, 1.1, 1.8, -HW - 0.04, 1.3, 0),
  };
  H.oshiireInner.userData.enabled = false;
  H.yukata.userData.enabled = false;

  // 歩ける範囲と障害物
  ctx.walk.push({ r: [-HW + R, HW - R, -HW + R, HW - R] });
  ctx.walk.push({ r: [0.1 + R, 0.9 - R, 1.4, 2.3], when: () => ctx.state.doorAnim > 0.85 });
  ctx.block.push({ r: [TABLE.x - 0.45 - R, TABLE.x + 0.45 - 0.05, TABLE.z - 0.31 - R, TABLE.z + 0.31 + R] });
  ctx.block.push({ c: [ANDON.x, ANDON.z, 0.17 + R] });
  ctx.zones.push({ name: 'tsubaki', r: [-HW, HW, -2.45, HW + 0.06] });

  return {
    oshiireLamp,
    H, door, oshS, card, moon, leakStrip, leakGlow, leakLight,
    clockPos: new THREE.Vector3(CLOCK.x, 0.12, CLOCK.z),
    doorPos: new THREE.Vector3(0.4, 0.9, HW),
  };
}

export function cardMaterials(kind) {
  const back = std({ color: 0x2a120c, roughness: 0.5 });
  // 札の面は暗がりでも絵柄が分かるよう、わずかに自ら光らせる
  const map = T.hanafudaTexture(kind);
  return [back, back, std({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.45 }), back, back, back];
}

function camelliaVase(x, y, z) {
  const vase = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const r = 0.035 + Math.sin(t * Math.PI) * 0.045 - t * 0.02 + (t > 0.85 ? (t - 0.85) * 0.2 : 0);
    pts.push(new THREE.Vector2(Math.max(r, 0.012), t * 0.26));
  }
  const v = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), std({ color: 0x2c3a34, roughness: 0.22, metalness: 0.05 }));
  v.castShadow = v.receiveShadow = true;
  vase.add(v);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.38, 6), std({ color: 0x3a2a1a }));
  stem.position.set(0.02, 0.4, 0);
  stem.rotation.z = -0.15;
  vase.add(stem);
  const leafMat = std({ color: 0x14301c, roughness: 0.3 });
  for (const [lx, ly, lz, a] of [[0.05, 0.42, 0.02, 0.6], [-0.02, 0.5, -0.02, -0.8], [0.06, 0.55, -0.02, 0.9], [0.0, 0.36, 0.03, -0.4]]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), leafMat);
    l.scale.set(1.4, 0.18, 0.6);
    l.position.set(lx, ly, lz);
    l.rotation.z = a;
    l.castShadow = true;
    vase.add(l);
  }
  vase.add(flower(0x8c0a16, 0.055, 0.6, 0.01));
  vase.position.set(x, y, z);
  return vase;
}

export function flower(color, x, y, z, petals = 6, size = 0.022) {
  const petal = std({ color, roughness: 0.5 });
  const g = new THREE.Group();
  for (let i = 0; i < petals; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), petal);
    const a = (i / petals) * Math.PI * 2;
    p.position.set(Math.cos(a) * size * 0.8, 0, Math.sin(a) * size * 0.8);
    p.scale.set(1, 0.55, 1);
    p.rotation.z = Math.cos(a) * 0.5;
    p.rotation.x = Math.sin(a) * 0.5;
    g.add(p);
  }
  const stamen = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.006, 0.02, 10), std({ color: 0xd9b340, emissive: 0x3a2a00 }));
  stamen.position.y = 0.012;
  g.add(stamen);
  g.position.set(x, y, z);
  g.rotation.z = -0.5;
  g.rotation.x = 0.3;
  return g;
}
