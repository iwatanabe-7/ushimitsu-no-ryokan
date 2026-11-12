// 2 帳場。宿帳、柱時計、奥の障子に女将の影
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { std, M, box, slab, wall, hitBox, ceiling, andon, post, chochin } from './kit.js';
import { WT, CHOBA as B, R } from './layout.js';

export function buildChoba(ctx) {
  const { scene, hits } = ctx;
  const floorTex = T.floorBoardsTexture();
  floorTex.repeat.set(1.8, 1.6);
  slab(B.x0, B.x1, -0.06, 0, B.z0 - WT, B.z1, std({ map: floorTex, roughness: 0.35, color: 0x987858 }), { cast: false });
  wall(B.x0 - WT, B.x0, 0, 2.4, B.z0 - WT, B.z1 + WT);
  wall(B.x1, B.x1 + WT, 0, 2.4, B.z0 - WT, B.z1 + WT);
  // 奥の壁と障子
  const sx0 = -0.6, sx1 = 1.2;
  wall(B.x0, sx0, 0, 2.4, B.z1, B.z1 + WT);
  wall(sx1, B.x1, 0, 2.4, B.z1, B.z1 + WT);
  wall(sx0, sx1, 2.0, 2.4, B.z1, B.z1 + WT);
  ceiling(B.x0, B.x1, B.z0, B.z1);

  // 一段上がった畳の間
  const PZ = 4.75, PH = 0.3;
  const tt = M.tatami[1].clone();
  tt.repeat.set(3, 2);
  tt.needsUpdate = true;
  slab(B.x0, B.x1, 0, PH, PZ, B.z1, std({ map: tt, bumpMap: tt, bumpScale: 1, roughness: 0.85, color: 0x9a9070 }));
  slab(B.x0, B.x1, 0, PH + 0.01, PZ - 0.03, PZ + 0.04, M.lacquer);

  // 帳場格子
  const gx0 = -1.3, gx1 = 1.9, gz = PZ + 0.08;
  const lattice = M.dark;
  slab(gx0, gx1, PH + 0.52, PH + 0.56, gz - 0.02, gz + 0.02, lattice);
  slab(gx0, gx1, PH, PH + 0.04, gz - 0.02, gz + 0.02, lattice);
  for (let x = gx0; x <= gx1 + 0.001; x += 0.065) slab(x - 0.009, x + 0.009, PH, PH + 0.54, gz - 0.009, gz + 0.009, lattice);
  for (const x of [gx0, gx1]) {
    slab(x - 0.02, x + 0.02, PH + 0.52, PH + 0.56, gz, gz + 0.6, lattice);
    for (let z = gz; z <= gz + 0.6; z += 0.065) slab(x - 0.009, x + 0.009, PH, PH + 0.54, z - 0.009, z + 0.009, lattice);
  }

  // 帳場机と宿帳
  const desk = new THREE.Group();
  desk.position.set(0.3, PH, 5.25);
  box(1.0, 0.035, 0.48, M.table, 0, 0.32, 0, { parent: desk });
  box(0.04, 0.3, 0.46, M.table, -0.47, 0.15, 0, { parent: desk });
  box(0.04, 0.3, 0.46, M.table, 0.47, 0.15, 0, { parent: desk });
  scene.add(desk);
  const ledgerTex = T.paperScrap(['桔梗の間　千代', '松の間　佐伯', '竹の間　小松', '菖蒲の間　遠野', '椿の間'], { seed: 121, tint: '#e2d8bc' });
  const book = new THREE.Group();
  for (const side of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.27), [M.dark, M.dark, std({ map: ledgerTex, roughness: 0.9 }), M.dark, M.dark, M.dark]);
    page.position.set(side * 0.1, 0.006, 0);
    page.rotation.z = side * -0.06;
    page.castShadow = page.receiveShadow = true;
    book.add(page);
  }
  book.position.set(0.3, PH + 0.345, 5.12);
  book.rotation.y = Math.PI;
  scene.add(book);
  // 硯と筆
  box(0.08, 0.02, 0.14, std({ color: 0x1a1a1c, roughness: 0.3 }), 0.68, PH + 0.348, 5.12);
  const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 8), std({ color: 0x8a6a3a }));
  brush.rotation.z = Math.PI / 2;
  brush.position.set(0.58, PH + 0.35, 4.98);
  scene.add(brush);
  // 算盤
  const soroban = new THREE.Group();
  box(0.32, 0.015, 0.1, M.dark, 0, 0, 0, { parent: soroban });
  const bead = std({ color: 0x2a1a10, roughness: 0.4 });
  for (let i = 0; i < 13; i++) {
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), bead);
      b.position.set(-0.144 + i * 0.024, 0.012, -0.03 + k * 0.018 + (k > 0 ? 0.01 : 0) + (i % 3 === 0 && k > 1 ? 0.008 : 0));
      soroban.add(b);
    }
  }
  soroban.position.set(-0.05, PH + 0.345, 5.12);
  scene.add(soroban);

  // 行灯
  const a = andon(-0.75, 5.7, {});
  a.group.position.y = PH;
  ctx.addLamp({ pos: new THREE.Vector3(-0.75, PH + 0.5, 5.7), color: 0xff9447, base: 3.2, paper: a.paper.material, paperBase: 1.4, kind: 'andon', zone: 'choba' });

  // 帳場の前の掛け提灯
  const hl = chochin(0.3, 1.85, 4.15, { kanji: '帳' });
  ctx.addLamp({ pos: new THREE.Vector3(0.3, 1.8, 4.15), color: 0xff8a40, base: 3.4, distance: 6, paper: hl.paper.material, paperBase: 1.6, kind: 'lantern', zone: 'choba' });
  ctx.sway.push({ mesh: hl.group, seed: 3.3, lantern: true });

  // 奥の障子（向こうから灯りに照らされている）
  const withFig = T.shojiSilhouette(true);
  const noFig = T.shojiSilhouette(false);
  const shoji = new THREE.Mesh(new THREE.PlaneGeometry(sx1 - sx0, 2.0 - PH), std({
    map: withFig, emissiveMap: withFig, emissive: 0xffa868, emissiveIntensity: 0.55, roughness: 0.9,
  }));
  shoji.rotation.y = Math.PI;
  shoji.position.set((sx0 + sx1) / 2, (2.0 + PH) / 2, B.z1 + 0.02);
  scene.add(shoji);
  const setFigure = (on) => {
    shoji.material.map = shoji.material.emissiveMap = on ? withFig : noFig;
    shoji.material.needsUpdate = true;
  };
  post(sx0, B.z1);
  post(sx1, B.z1);

  // 柱時計（東の壁）
  const pc = new THREE.Group();
  pc.position.set(B.x1 - 0.08, 1.55, 4.35);
  pc.rotation.y = -Math.PI / 2;
  const caseMat = std({ map: T.woodMap('dark'), roughness: 0.35, color: 0x6a4a34 });
  box(0.34, 0.75, 0.13, caseMat, 0, 0, 0, { parent: pc });
  const face = T.clockFace();
  const faceMesh = new THREE.Mesh(new THREE.CircleGeometry(0.12, 40), std({ map: face.texture, emissiveMap: face.texture, emissive: 0x2a2014, emissiveIntensity: 0.4, roughness: 0.3 }));
  faceMesh.position.set(0, 0.18, 0.066);
  pc.add(faceMesh);
  const pend = new THREE.Group();
  pend.position.set(0, 0.0, 0.05);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.26, 0.004), M.brass);
  rod.position.y = -0.13;
  pend.add(rod);
  const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 24), M.brass);
  bob.rotation.x = Math.PI / 2;
  bob.position.y = -0.27;
  pend.add(bob);
  pc.add(pend);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.36), std({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 0.05 }));
  glass.position.set(0, -0.15, 0.066);
  pc.add(glass);
  scene.add(pc);
  face.zone = 'choba'; // この部屋が見えているときだけ文字盤を描き直す
  ctx.clockFaces.push(face);
  const pillarClockPos = new THREE.Vector3(B.x1 - 0.1, 1.55, 4.35);
  ctx.tickSources.push({ pos: pillarClockPos, kind: 'pillar', pendulum: pend });

  const H = {
    ledger: hitBox(hits, 'ledger', 0.6, 0.3, 0.45, 0.3, PH + 0.4, 5.12),
    soroban: hitBox(hits, 'soroban', 0.36, 0.15, 0.16, -0.05, PH + 0.38, 5.12),
    chobaShoji: hitBox(hits, 'chobaShoji', sx1 - sx0, 1.7, 0.1, (sx0 + sx1) / 2, 1.15, B.z1 - 0.03),
    pillarClock: hitBox(hits, 'pillarClock', 0.2, 0.8, 0.4, B.x1 - 0.1, 1.55, 4.35),
  };

  ctx.walk.push({ r: [B.open[0] + R, B.open[1] - R, 3.2, 3.95] });
  ctx.walk.push({ r: [B.x0 + R, B.x1 - R, 3.84, PZ - R] });
  ctx.zones.push({ name: 'choba', r: [B.x0, B.x1, B.z0 - WT + 0.06, B.z1] });
  return { H, setFigure, shoji, pillarClockPos, ledgerPos: new THREE.Vector3(0.3, 0.7, 5.12) };
}
