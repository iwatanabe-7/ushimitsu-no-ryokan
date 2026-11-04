// 渡り廊下と中庭。月明かりの庭に、池と石灯籠、松、古井戸
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as T from '../core/textures.js';
import { std, M, box, slab, wall, hitBox, chochin, slidingDoor, groundWithHole } from './kit.js';
import { WT, R, WATARI as W, GARDEN as Gd, HIROMA } from './layout.js';

export function buildWatari(ctx) {
  const { scene, hits } = ctx;
  // ---------------------------------------------------------- 渡り廊下
  const floorTex = T.floorBoardsTexture();
  floorTex.repeat.set((W.x1 - W.x0) / 3.2, 1);
  slab(W.x0, W.x1, -0.06, 0, W.z0, W.z1, std({ map: floorTex, roughness: 0.3, color: 0x9a7a5a }), { cast: false });
  slab(W.x0, W.x1, Gd.y, -0.06, Gd.z1, W.z0, M.dark); // 縁の下
  slab(W.x0, W.x1 + WT, 2.4, 2.46, Gd.z1 - 0.4, W.z1 + WT, std({ map: T.woodMap('cedar', { rotate: true, repeat: [1, 6] }), roughness: 0.75, color: 0x8a7458 }));
  slab(W.x0, W.x1 + WT, 2.46, 2.56, Gd.z1 - 0.5, W.z1 + WT, std({ color: 0x2a2826, roughness: 0.6 })); // 瓦屋根の下端
  for (let x = W.x0 + 0.9; x < W.x1; x += 1.85) {
    box(0.12, 2.4, 0.12, M.pillar, x, 1.2, W.z0 - 0.06);
  }
  // 高欄（階段の口だけ空いている）
  const [s0, s1] = W.steps;
  for (const [a, b] of [[W.x0, s0], [s1, W.x1]]) {
    slab(a, b, 0.52, 0.58, W.z0 - 0.1, W.z0 - 0.02, M.beam);
    slab(a, b, 0.22, 0.26, W.z0 - 0.09, W.z0 - 0.03, M.beam);
    for (let x = a + 0.3; x < b; x += 0.6) slab(x - 0.025, x + 0.025, 0, 0.55, W.z0 - 0.09, W.z0 - 0.03, M.beam);
  }
  // 沓脱石と踏み段
  const stone = std({ map: T.wallMap([1, 1]), color: 0x8a8880, roughness: 0.85 });
  slab(s0 + 0.05, s1 - 0.05, -0.32, -0.2, W.z0 - 0.55, W.z0 - 0.05, stone);
  // 南の壁と大広間の入口
  const hd = HIROMA.door;
  wall(W.x0, hd - 0.9, 0, 2.4, W.z1, W.z1 + WT);
  wall(hd + 0.9, W.x1, 0, 2.4, W.z1, W.z1 + WT);
  wall(hd - 0.9, hd + 0.9, 1.8, 2.4, W.z1, W.z1 + WT);
  const hiromaDoor = slidingDoor({ cx: hd, zWall: W.z1, tex: T.fusumaTexture({ seed: 43, karakami: true }) });

  const lanterns = [];
  [12.3, 16.2].forEach((x, i) => {
    const l = chochin(x, 1.98, 2.72);
    const lamp = ctx.addLamp({ pos: new THREE.Vector3(x, 1.9, 2.72), color: 0xff8536, base: 3.8, distance: 7, paper: l.paper.material, paperBase: 1.7, kind: 'lantern', zone: 'watari' });
    lanterns.push(lamp);
    ctx.sway.push({ mesh: l.group, seed: 7 + i, lantern: true });
  });

  // ---------------------------------------------------------- 中庭
  const P = { x: 12.9, z: -3.3, rx: 1.9, rz: 1.25 };
  const gravel = T.gravelTexture();
  gravel.repeat.set(0.8, 0.8);
  groundWithHole({
    x0: Gd.x0, x1: Gd.x1, z0: Gd.z0, z1: Gd.z1, y: Gd.y, hole: [P.x, P.z, P.rx, P.rz], depth: 0.45,
    mat: std({ map: gravel, roughness: 0.95, color: 0x8a8a90 }),
    wallMat: std({ color: 0x3a3a36, roughness: 0.9 }),
    bedMat: std({ color: 0x0c1012, roughness: 0.9 }),
  });
  // 築地塀と竹垣
  const plaster = std({ map: T.wallMap([6, 1.5]), color: 0xc8bca4, roughness: 0.95 });
  slab(Gd.x0, Gd.x1 + 0.1, Gd.y, 2.4, Gd.z0 - 0.3, Gd.z0, plaster);
  slab(Gd.x0, Gd.x1 + 0.1, 2.4, 2.55, Gd.z0 - 0.4, Gd.z0 + 0.1, std({ color: 0x24262a, roughness: 0.5 }));
  slab(Gd.x0 - 0.12, Gd.x0, Gd.y, 2.4, Gd.z0, -0.9, plaster);
  const bamboo = std({ color: 0x6a6a3a, roughness: 0.5 });
  for (let z = Gd.z0 + 0.05; z < Gd.z1 - 0.3; z += 0.07) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), bamboo);
    b.position.set(Gd.x1 + 0.05, Gd.y + 0.95, z);
    b.castShadow = b.receiveShadow = true;
    scene.add(b);
  }
  for (const y of [0.3, 1.1, 1.7]) slab(Gd.x1 - 0.02, Gd.x1 + 0.12, Gd.y + y, Gd.y + y + 0.04, Gd.z0, Gd.z1 - 0.3, std({ color: 0x3a3020 }));

  // 池（水面は鏡にする）
  const pondGeo = new THREE.CircleGeometry(1, 48);
  const pond = new Reflector(pondGeo, { clipBias: 0.003, textureWidth: 512, textureHeight: 512, color: 0x5a6670 });
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(P.rx, P.rz, 1);
  pond.position.set(P.x, Gd.y - 0.14, P.z);
  scene.add(pond);
  // 池の縁石
  const rock = (x, z, s, y = Gd.y) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), std({ color: 0x5c5a54, roughness: 0.85, flatShading: true }));
    m.scale.set(1.3, 0.6, 1);
    m.rotation.y = x * 3.1;
    m.position.set(x, y + s * 0.25, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    rock(P.x + Math.cos(a) * (P.rx + 0.08), P.z + Math.sin(a) * (P.rz + 0.08), 0.13 + ((i * 7) % 5) * 0.025);
  }
  rock(15.0, -5.2, 0.45);
  rock(11.4, -5.6, 0.35);
  rock(16.6, 0.6, 0.3);

  // 石灯籠
  const ISHI = new THREE.Vector3(15.5, Gd.y, -1.6);
  const ishi = new THREE.Group();
  ishi.position.copy(ISHI);
  const granite = std({ map: T.wallMap([1, 1]), color: 0x8a8a84, roughness: 0.9 });
  const cyl = (rt, rb, h, y, seg = 6) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), granite);
    m.position.y = y;
    m.castShadow = m.receiveShadow = true;
    ishi.add(m);
    return m;
  };
  cyl(0.28, 0.32, 0.12, 0.06);
  cyl(0.08, 0.1, 0.7, 0.47, 12);
  cyl(0.24, 0.16, 0.1, 0.87);
  const fire = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), std({ color: 0x2a2620, emissive: 0xffa040, emissiveIntensity: 1.2, emissiveMap: T.lanternPaper() }));
  fire.position.y = 1.04;
  ishi.add(fire);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.22, 6), granite);
  roof.position.y = 1.27;
  roof.castShadow = true;
  ishi.add(roof);
  cyl(0.03, 0.06, 0.12, 1.42, 8);
  scene.add(ishi);
  ctx.addLamp({ pos: ISHI.clone().setY(Gd.y + 1.05), color: 0xffa050, base: 1.4, distance: 5, paper: fire.material, paperBase: 1.2, kind: 'andon', zone: 'garden' });

  // 松
  const pine = new THREE.Group();
  pine.position.set(11.6, Gd.y, -0.6);
  const bark = std({ map: T.woodMap('dark'), color: 0x6a5a4a, roughness: 0.9 });
  const trunkCurve = new THREE.CatmullRomCurve3([[0, 0, 0], [0.15, 0.8, 0.1], [-0.05, 1.6, 0.25], [0.5, 2.3, 0.4], [1.2, 2.6, 0.3]].map((p) => new THREE.Vector3(...p)));
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 24, 0.11, 8), bark);
  trunk.castShadow = true;
  pine.add(trunk);
  const needles = std({ color: 0x1a2e1e, roughness: 0.8 });
  for (const [x, y, z, s] of [[1.2, 2.6, 0.3, 0.6], [0.5, 2.35, 0.4, 0.55], [-0.05, 1.7, 0.25, 0.5], [0.6, 1.9, -0.3, 0.45], [-0.4, 2.1, 0.6, 0.4]]) {
    const pad = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), needles);
    pad.scale.set(1.5, 0.35, 1.2);
    pad.position.set(x, y, z);
    const p = pad.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + Math.sin(p.getX(i) * 13 + p.getZ(i) * 7) * 0.12;
      p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k);
    }
    pad.geometry.computeVertexNormals();
    pad.castShadow = pad.receiveShadow = true;
    pine.add(pad);
  }
  scene.add(pine);

  // 古井戸
  const WELL = new THREE.Vector3(16.3, Gd.y, -4.7);
  const well = new THREE.Group();
  well.position.copy(WELL);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.7, 20, 1, true), std({ map: T.wallMap([2, 1]), color: 0x7a7870, roughness: 0.9, side: THREE.DoubleSide }));
  ring.position.y = 0.35;
  ring.castShadow = ring.receiveShadow = true;
  well.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.48, 20), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.2;
  well.add(hole);
  const lid = std({ map: T.woodMap('dark', { rotate: true }), roughness: 0.7 });
  box(1.1, 0.04, 0.5, lid, 0, 0.72, -0.26, { parent: well });
  for (const s of [-1, 1]) box(0.07, 1.5, 0.07, lid, s * 0.55, 0.75, 0, { parent: well });
  box(1.25, 0.08, 0.08, lid, 0, 1.5, 0, { parent: well });
  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16), M.dark);
  pulley.position.y = 1.4;
  well.add(pulley);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.2, 4), std({ color: 0x8a7a5a }));
  rope.position.set(0.07, 0.85, 0);
  well.add(rope);
  scene.add(well);

  // 夜空
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ map: T.skyTexture(), side: THREE.BackSide, fog: false }));
  sky.position.set(16, 0, 0);
  scene.add(sky);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: 0xe8ecf4, fog: false }));
  moonDisc.position.set(4, 34, -46);
  moonDisc.lookAt(16, 0, 0);
  scene.add(moonDisc);

  // 屋外の月明かり（中庭と露天風呂を照らす）。建物は動かないので影は一度だけ描く
  const moon = new THREE.SpotLight(0xa8bcff, 0, 0, 0.62, 0.6, 1.2);
  moon.position.set(12, 15, -12);
  moon.target.position.set(17.5, 0, -2.5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.userData.minShadow = 2048;
  moon.shadow.camera.near = 5;
  moon.shadow.camera.far = 40;
  moon.shadow.bias = -0.0006;
  moon.shadow.autoUpdate = false;
  moon.shadow.needsUpdate = true;
  scene.add(moon, moon.target);

  const H = {
    pond: hitBox(hits, 'pond', P.rx * 2, 0.4, P.rz * 2, P.x, Gd.y, P.z),
    ishidoro: hitBox(hits, 'ishidoro', 0.6, 1.5, 0.6, ISHI.x, Gd.y + 0.75, ISHI.z),
    pine: hitBox(hits, 'pine', 0.6, 2.0, 0.6, 11.6, Gd.y + 1.0, -0.6),
    well: hitBox(hits, 'well', 1.2, 1.6, 1.2, WELL.x, Gd.y + 0.8, WELL.z),
    hiromaDoor: hitBox(hits, 'hiromaDoor', 1.8, 1.8, 0.1, hd, 0.9, W.z1 - 0.04),
  };

  ctx.walk.push({ r: [W.x0 - 0.3, W.x1 - R, W.z0 + R, W.z1 - R] });
  ctx.walk.push({ r: [s0 + 0.12, s1 - 0.12, Gd.z1 - 0.6, W.z0 + 0.4] });
  ctx.walk.push({ r: [Gd.x0 + R, Gd.x1 - R, Gd.z0 + R, Gd.z1 - R] });
  ctx.walk.push({ r: [hiromaDoor.gapX[0] + R, hiromaDoor.gapX[1] - R, 3.0, 4.1], when: () => ctx.state.hiromaAnim > 0.85 });
  ctx.block.push({ e: [P.x, P.z, P.rx + 0.15 + R * 0.6, P.rz + 0.15 + R * 0.6] });
  ctx.block.push({ c: [ISHI.x, ISHI.z, 0.3 + R] });
  ctx.block.push({ c: [11.6, -0.6, 0.15 + R] });
  ctx.block.push({ c: [WELL.x, WELL.z, 0.55 + R] });
  ctx.block.push({ c: [15.0, -5.2, 0.55 + R] });
  ctx.block.push({ c: [11.4, -5.6, 0.45 + R] });
  ctx.block.push({ c: [16.6, 0.6, 0.35 + R] });
  ctx.floors.push({ r: [s0, s1, Gd.z1 - 0.6, W.z0 - 0.02], y: -0.2 });
  ctx.floors.push({ r: [Gd.x0, Gd.x1, Gd.z0, Gd.z1], y: Gd.y });
  ctx.zones.push({ name: 'watari', r: [W.x0, W.x1, W.z0 - 0.06, W.z1 + 0.06] });
  ctx.zones.push({ name: 'garden', r: [Gd.x0, Gd.x1, Gd.z0, W.z0 - 0.06] });

  return { H, hiromaDoor, pond, moon, lanterns, wellPos: WELL.clone().setY(Gd.y + 0.3) };
}
