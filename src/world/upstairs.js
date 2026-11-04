// 西の階段と二階。松の間（佐伯）と竹の間（小松）は、宿帳に花の印のない客の部屋
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { setRoot, std, M, box, slab, wall, hitBox, tatami, roomShell, andon, chochin, fuzukue, post } from './kit.js';
import { WT, R, STAIRS as St, F2, F2CORR as C2, MATSU, TAKE, sixMats } from './layout.js';

export function buildUpstairs(ctx) {
  const { scene, hits } = ctx;
  // ---------------------------------------------------------- 階段
  const steps = 12;
  const run = (St.bottom - St.top) / steps, rise = F2 / steps;
  const tread = std({ map: T.woodMap('pillar', { rotate: true }), roughness: 0.45, color: 0xa08060 });
  for (let i = 0; i < steps; i++) {
    const xa = St.bottom - i * run, xb = St.bottom - (i + 1) * run;
    slab(xb, xa, 0, (i + 1) * rise, St.z0, St.z1, tread);
    slab(xb, xb + 0.02, (i + 1) * rise - 0.03, (i + 1) * rise, St.z0, St.z1, M.dark, { cast: false });
  }
  const topY = F2 + 2.4;
  wall(St.top - WT, St.x1, 0, topY, St.z0 - WT, St.z0);
  wall(St.top - WT, St.x1, 0, topY, St.z1, St.z1 + WT);
  wall(St.top - WT, St.top, 0, F2, St.z0, St.z1);
  wall(St.x1 - WT, St.x1, 2.36, topY, St.z0, St.z1);
  slab(St.top - WT, St.x1, topY, topY + 0.05, St.z0 - WT, St.z1 + WT, M.cedar);
  // 手すり
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(St.bottom - St.top, F2) + 0.2, 10), M.beam);
  rail.rotation.z = Math.PI / 2 - Math.atan2(F2, St.bottom - St.top);
  rail.position.set((St.bottom + St.top) / 2, F2 / 2 + 0.85, St.z1 - 0.05);
  scene.add(rail);
  // 掛け行灯
  const kake = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.12), std({ map: T.lanternPaper(), emissiveMap: T.lanternPaper(), emissive: 0xffa04a, emissiveIntensity: 1.3, color: 0x332211 }));
  kake.position.set(-3.75, 2.25, St.z0 + 0.07);
  scene.add(kake);
  ctx.addLamp({ pos: new THREE.Vector3(-3.75, 2.2, St.z0 + 0.25), color: 0xff9447, base: 2.2, paper: kake.material, paperBase: 1.3, kind: 'andon', zone: 'stairs' });

  ctx.walk.push({ r: [St.top - 0.35, St.x1 + 0.2, St.z0 + R, St.z1 - R], lv: 'any' });
  ctx.floors.push({
    r: [St.top - 0.3, St.bottom, St.z0, St.z1], lv: 'any', stairs: true,
    fn: (x) => Math.min(1, Math.max(0, (St.bottom - x) / (St.bottom - St.top))) * F2,
  });
  ctx.zones.push({ name: 'stairs', r: [St.top, St.x1, St.z0, St.z1], lv: 'any' });

  // ---------------------------------------------------------- 二階（床の高さ F2 の組）
  const g2 = new THREE.Group();
  g2.position.y = F2;
  scene.add(g2);
  setRoot(g2);
  const floorTex = T.floorBoardsTexture();
  floorTex.repeat.set(1, (C2.z1 - C2.z0) / 3.2);
  floorTex.rotation = Math.PI / 2;
  slab(C2.x0, C2.x1, -0.06, 0, C2.z0, C2.z1, std({ map: floorTex, roughness: 0.35, color: 0x9a7a5a }), { cast: false });
  slab(C2.x0 - WT, C2.x1 + WT, 2.4, 2.46, C2.z0 - WT, C2.z1 + WT, M.cedar);
  wall(C2.x1, C2.x1 + WT, 0, 2.4, St.z1, C2.z1 + WT); // 東（階段の口より南）
  wall(C2.x0 - WT, C2.x1 + WT, 0, 2.4, C2.z0 - WT, C2.z0); // 北
  wall(C2.x0 - WT, C2.x0, 0, 2.4, C2.z0, MATSU.cz - 1.8);
  wall(C2.x0 - WT, C2.x0, 0, 2.4, TAKE.cz + 1.8, C2.z1);
  // 南の突き当たりの窓
  const [w0, w1] = [C2.x0 + 0.2, C2.x1 - 0.2];
  wall(C2.x0 - WT, w0, 0, 2.4, C2.z1, C2.z1 + WT);
  wall(w1, C2.x1 + WT, 0, 2.4, C2.z1, C2.z1 + WT);
  wall(w0, w1, 0, 0.8, C2.z1, C2.z1 + WT);
  wall(w0, w1, 1.9, 2.4, C2.z1, C2.z1 + WT);
  const shojiT = T.shojiTexture();
  const win = new THREE.Mesh(new THREE.PlaneGeometry(w1 - w0, 1.1), std({ map: shojiT, emissiveMap: shojiT, emissive: 0x5d6b88, emissiveIntensity: 0.45, roughness: 0.9 }));
  win.rotation.y = Math.PI;
  win.position.set((w0 + w1) / 2, 1.35, C2.z1 + 0.05);
  g2.add(win);
  for (const z of [C2.z0 + 0.05, MATSU.cz - 1.8, MATSU.cz + 1.86, TAKE.cz + 1.8, C2.z1 - 0.05]) post(C2.x0 + 0.03, z);
  const l2 = chochin(-5.8, 1.98, 5.9);
  ctx.addLamp({ pos: new THREE.Vector3(-5.8, F2 + 1.9, 5.9), color: 0xff8536, base: 3.0, distance: 6, paper: l2.paper.material, paperBase: 1.6, kind: 'lantern', zone: 'f2' });
  ctx.sway.push({ mesh: l2.group, seed: 11, lantern: true });

  // 二つの客室は、廊下に向いた襖が南になるよう向きを回して建てる
  const room = (C, name, tint) => {
    const g = new THREE.Group();
    g.position.set(C.cx, 0, C.cz);
    g.rotation.y = Math.PI / 2;
    g2.add(g);
    setRoot(g);
    tatami(sixMats(-1.8, -1.35), 0.56);
    const door = roomShell({ x0: -1.8, x1: 1.8, z0: -1.35, z1: 1.35, doorCx: 0, tex: T.fusumaTexture({ seed: name === 'matsu' ? 51 : 53, karakami: name !== 'matsu' }), tint });
    door.open(0.85); // 少し開いたまま
    // 北の壁（外側）の障子窓
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), std({ map: shojiT, emissiveMap: shojiT, emissive: 0x5d6b88, emissiveIntensity: 0.4, roughness: 0.9 }));
    w.position.set(0.6, 1.35, -1.34);
    g.add(w);
    const toWorld = (lx, lz) => [C.cx + lz, C.cz - lx];
    return { g, door, toWorld };
  };

  // 松の間：何も残っていない。文机に書き置き
  const matsu = room(MATSU, 'matsu', 0xb0a48c);
  fuzukue(1.0, -1.05);
  const noteM = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.18), std({ map: T.paperScrap(['九月九日', '女将に記帳を', '勧められたが', '断った'], { seed: 321 }), roughness: 0.9 }));
  noteM.rotation.x = -Math.PI / 2;
  noteM.position.set(1.0, 0.318, -1.05);
  matsu.g.add(noteM);
  for (let i = 0; i < 2; i++) box(0.75, 0.12, 0.95, std({ color: i ? 0xc8c0b0 : 0x5a4a40, roughness: 0.95 }), -1.25, 0.06 + i * 0.12, -0.75);
  const hm = {
    matsuNote: hitBox(hits, 'matsuNote', 0.8, 0.4, 0.45, 1.0, 0.3, -1.05),
    matsuWindow: hitBox(hits, 'matsuWindow', 1.6, 1.0, 0.1, 0.6, 1.35, -1.3),
  };

  // 竹の間：行灯が点いている。折り鶴と書き置き
  const take = room(TAKE, 'take', 0xa8a08a);
  fuzukue(-1.0, -1.05);
  const crane = new THREE.Group();
  const paperW = std({ color: 0xc83a3a, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
  const wing = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 3), paperW);
  wing.rotation.z = Math.PI / 2;
  crane.add(wing);
  const wing2 = wing.clone();
  wing2.rotation.z = -Math.PI / 2;
  crane.add(wing2);
  const neck = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.08, 3), paperW);
  neck.position.set(0, 0.03, 0.04);
  neck.rotation.x = 0.8;
  crane.add(neck);
  crane.position.set(-1.15, 0.36, -1.0);
  take.g.add(crane);
  const noteT = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.18), std({ map: T.paperScrap(['八月十二日', '夜中に', '女の子が', '廊下を', '走っていった'], { seed: 331 }), roughness: 0.9 }));
  noteT.rotation.x = -Math.PI / 2;
  noteT.position.set(-0.85, 0.318, -1.05);
  take.g.add(noteT);
  const aT = andon(1.3, -0.95);
  const [tax, taz] = take.toWorld(1.3, -0.95);
  ctx.addLamp({ pos: new THREE.Vector3(tax, F2 + 0.5, taz), color: 0xff9447, base: 2.8, paper: aT.paper.material, paperBase: 1.3, kind: 'andon', zone: 'take' });
  const ht = {
    takeNote: hitBox(hits, 'takeNote', 0.8, 0.4, 0.45, -1.0, 0.3, -1.05),
    crane: hitBox(hits, 'crane', 0.25, 0.2, 0.25, -1.15, 0.36, -1.0),
  };
  setRoot(scene);

  // 歩ける範囲（二階）
  ctx.walk.push({ r: [C2.x0 + R, C2.x1 - R, C2.z0 + R, C2.z1 - R], lv: 1 });
  for (const [C, rm] of [[MATSU, matsu], [TAKE, take]]) {
    ctx.walk.push({ r: [C.cx - 1.35 + R, C.cx + 1.35 - R, C.cz - 1.8 + R, C.cz + 1.8 - R], lv: 1 });
    ctx.walk.push({ r: [C.cx + 1.0, C.cx + 1.75, C.cz - 0.9 + R, C.cz - 0.1 - R], lv: 1 });
  }
  // 家具（ローカル座標から換算）
  const blockLocal = (rm, lx0, lx1, lz0, lz1) => {
    const [ax, az] = rm.toWorld(lx0, lz0), [bx, bz] = rm.toWorld(lx1, lz1);
    ctx.block.push({ r: [Math.min(ax, bx) - R, Math.max(ax, bx) + R, Math.min(az, bz) - R, Math.max(az, bz) + R], lv: 1 });
  };
  blockLocal(matsu, 0.62, 1.38, -1.35, -0.85);
  blockLocal(matsu, -1.8, -0.85, -1.25, -0.25);
  blockLocal(take, -1.38, -0.62, -1.35, -0.85);
  blockLocal(take, 1.13, 1.47, -1.12, -0.78);
  ctx.zones.push({ name: 'f2', r: [C2.x0, C2.x1, C2.z0, C2.z1], lv: 1 });
  ctx.zones.push({ name: 'matsu', r: [MATSU.cx - 1.35, MATSU.cx + 1.41, MATSU.cz - 1.8, MATSU.cz + 1.8], lv: 1 });
  ctx.zones.push({ name: 'take', r: [TAKE.cx - 1.35, TAKE.cx + 1.41, TAKE.cz - 1.8, TAKE.cz + 1.8], lv: 1 });

  return { H: { ...hm, ...ht } };
}
