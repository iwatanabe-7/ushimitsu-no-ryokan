// 5 玄関。上がり框の下に土間、引き戸の脇に花札錠
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { std, M, box, slab, wall, hitBox, ceiling, chochin, post, andon } from './kit.js';
import { WT, GENKAN as G, R } from './layout.js';
import { cardMaterials } from './tsubaki.js';

export function buildGenkan(ctx) {
  const { scene, hits } = ctx;
  const D = G.doma;
  const floorTex = T.floorBoardsTexture();
  floorTex.repeat.set(1.6, 1);
  // 式台（板の間）
  slab(G.x0, G.x1, -0.06, 0, G.z0 - WT, G.step, std({ map: floorTex, roughness: 0.3, color: 0x9a7a5a }), { cast: false });
  // 上がり框
  slab(G.x0, G.x1, D, 0.005, G.step - 0.02, G.step + 0.1, M.lacquer);
  // 土間（三和土）
  const domaTex = T.wallMap([3, 2]);
  slab(G.x0, G.x1, D - 0.06, D, G.step + 0.1, G.z1, std({ map: domaTex, roughness: 0.92, color: 0x6e6a62 }), { cast: false });
  // 踏み石
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.16, 9), std({ color: 0x5a5852, roughness: 0.8, flatShading: true }));
  stone.scale.set(1.3, 1, 0.8);
  stone.position.set(8.0, D + 0.08, G.step + 0.42);
  stone.castShadow = stone.receiveShadow = true;
  scene.add(stone);

  // 壁
  wall(G.x0 - WT, G.x0, D, 2.4, G.z0 - WT, G.z1 + WT);
  wall(G.x1, G.x1 + WT, D, 2.4, G.z0 - WT, G.z1 + WT);
  const [d0, d1] = G.door;
  wall(G.x0, d0, D, 2.4, G.z1, G.z1 + WT);
  wall(d1, G.x1, D, 2.4, G.z1, G.z1 + WT);
  wall(d0, d1, 1.75, 2.4, G.z1, G.z1 + WT);
  ceiling(G.x0, G.x1, G.z0, G.z1);
  post(G.x0, G.z1);
  post(G.x1, G.z1);
  post(d0, G.z1);
  post(d1, G.z1);
  slab(d0, d1, 1.7, 1.78, G.z1 - 0.02, G.z1 + WT, M.beam);

  // 引き戸（磨りガラスの向こうは霧）
  const glassTex = T.genkanDoorTexture();
  const doorMat = std({ map: glassTex, emissiveMap: glassTex, emissive: 0x8fa0c0, emissiveIntensity: 0.5, roughness: 0.4 });
  const panels = [];
  [[d0 + 0.45, G.z1 + 0.03], [d0 + 1.35, G.z1 + 0.07]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.75 - D, 0.03), doorMat);
    p.position.set(x, (1.75 + D) / 2, z);
    p.castShadow = true;
    scene.add(p);
    panels.push(p);
  });
  // 外の霧の光（扉が開いたとき用）
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.1), new THREE.MeshBasicMaterial({ color: 0xa8b4c8 }));
  outside.position.set((d0 + d1) / 2, (1.75 + D) / 2, G.z1 + 0.2);
  outside.rotation.y = Math.PI;
  scene.add(outside);
  const moonDoor = new THREE.PointLight(0x9fb0d0, 0, 6, 2);
  moonDoor.position.set((d0 + d1) / 2, 1.0, G.z1 - 0.4);
  scene.add(moonDoor);

  // 花札錠（引き戸の右）
  const lock = new THREE.Group();
  lock.position.set(9.45, 1.0, G.z1 - 0.04);
  lock.rotation.y = Math.PI;
  box(0.42, 0.26, 0.07, std({ map: T.woodMap('dark'), roughness: 0.3, color: 0x7a5a40 }), 0, 0, 0, { parent: lock });
  const slots = [];
  for (let i = 0; i < 3; i++) {
    box(0.09, 0.15, 0.01, M.lacquer, -0.13 + i * 0.13, -0.01, 0.036, { parent: lock, cast: false });
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.128, 0.004), cardMaterials('tsubaki'));
    c.rotation.x = Math.PI / 2;
    c.position.set(-0.13 + i * 0.13, -0.01, 0.043);
    c.visible = false;
    lock.add(c);
    slots.push(c);
  }
  box(0.36, 0.03, 0.03, M.brass, 0, 0.1, 0.04, { parent: lock });
  scene.add(lock);

  // 下駄箱と履物
  const getaX0 = G.x0, getaX1 = G.x0 + 0.42, getaZ0 = G.step + 0.25, getaZ1 = G.z1 - 0.1;
  slab(getaX0, getaX1, D, D + 1.05, getaZ0, getaZ1, std({ map: T.woodMap('pillar', { rotate: true }), roughness: 0.5, color: 0xa08060 }));
  for (let z = getaZ0 + 0.38; z < getaZ1; z += 0.38) slab(getaX1, getaX1 + 0.005, D + 0.05, D + 1.0, z - 0.005, z + 0.005, M.dark, { cast: false });
  slab(getaX1, getaX1 + 0.005, D + 0.52, D + 0.53, getaZ0, getaZ1, M.dark, { cast: false });
  const getaMat = std({ map: T.woodMap('light'), roughness: 0.6 });
  const strap = std({ color: 0x7a1a1a });
  [[7.2, 6.2], [7.45, 6.25], [9.6, 6.6]].forEach(([x, z], i) => {
    for (const s of [-0.06, 0.06]) {
      box(0.09, 0.03, 0.22, getaMat, x + s, D + 0.045, z);
      box(0.08, 0.03, 0.02, getaMat, x + s, D + 0.015, z - 0.06);
      box(0.08, 0.03, 0.02, getaMat, x + s, D + 0.015, z + 0.06);
      box(0.012, 0.015, 0.1, strap, x + s, D + 0.07, z - 0.03);
    }
  });
  // 自分の靴
  const shoe = std({ color: 0x141210, roughness: 0.35 });
  for (const s of [-0.065, 0.065]) {
    const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.17, 4, 10), shoe);
    sh.rotation.x = Math.PI / 2;
    sh.scale.set(1, 1, 0.7);
    sh.position.set(8.3 + s, D + 0.04, G.step + 0.35);
    sh.castShadow = true;
    scene.add(sh);
  }

  // 大提灯
  const lan = chochin(8.0, 1.75, 4.6, { kanji: '宿', scale: 1.35 });
  const lanternLamp = ctx.addLamp({ pos: new THREE.Vector3(8.0, 1.7, 4.6), color: 0xff8a40, base: 6.5, distance: 9, paper: lan.paper.material, paperBase: 1.7, kind: 'lantern', zone: 'genkan' });
  ctx.sway.push({ mesh: lan.group, seed: 5.1, lantern: true });

  // 土間の置き行灯
  const ga = andon(9.9, 6.9);
  ga.group.position.y = D;
  const domaLamp = ctx.addLamp({ pos: new THREE.Vector3(9.9, D + 0.5, 6.9), color: 0xff9447, base: 2.6, paper: ga.paper.material, paperBase: 1.3, kind: 'andon', zone: 'genkan' });
  ctx.block.push({ c: [9.9, 6.9, 0.17 + R] });

  // 驚かせ3用：廊下側から玄関へ差し込む灯り。普段は消しておき、影の計算もしない
  const scareSpot = new THREE.SpotLight(0xffb070, 0, 10, 0.55, 0.3, 1.4);
  scareSpot.position.set(8.0, 1.55, 3.3);
  scareSpot.target.position.set(9.6, 1.0, G.z1);
  scareSpot.castShadow = false; // 花札錠を開いたときに有効にする（普段は影の計算を省く）
  scareSpot.shadow.mapSize.set(2048, 2048);
  scareSpot.userData.minShadow = 2048;
  scareSpot.shadow.radius = 1.5;
  scareSpot.shadow.camera.near = 0.3;
  scareSpot.shadow.camera.far = 9;
  scareSpot.shadow.bias = -0.0005;
  scareSpot.shadow.autoUpdate = false;
  scene.add(scareSpot, scareSpot.target);

  const H = {
    getabako: hitBox(hits, 'getabako', 0.5, 1.1, 1.8, (getaX0 + getaX1) / 2, D + 0.5, (getaZ0 + getaZ1) / 2),
    genkanDoor: hitBox(hits, 'genkanDoor', d1 - d0, 2.0, 0.12, (d0 + d1) / 2, 0.7, G.z1 - 0.02),
    lock: hitBox(hits, 'lock', 0.5, 0.4, 0.2, 9.45, 1.0, G.z1 - 0.08),
  };

  ctx.walk.push({ r: [G.open[0] + R, G.open[1] - R, 3.2, 3.95] });
  ctx.walk.push({ r: [G.x0 + R, G.x1 - R, 3.84, G.z1 - R] });
  ctx.block.push({ r: [getaX0, getaX1 + R, getaZ0 - R, getaZ1 + R] });
  ctx.zones.push({ name: 'genkan', r: [G.x0, G.x1, G.z0 - WT + 0.06, G.z1] });
  ctx.floors.push({ r: [G.x0, G.x1, G.step + 0.05, G.z1], y: D });

  return {
    H, panels, slots, outside, moonDoor, lanternLamp, domaLamp, scareSpot,
    lockPos: new THREE.Vector3(9.45, 1.0, G.z1 - 0.1),
    open(t) {
      panels[1].position.x = d0 + 1.35 - 0.85 * t;
    },
  };
}
