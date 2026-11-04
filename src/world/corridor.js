// 廊下。北に客室、南に帳場と玄関
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { std, M, box, slab, wall, hitBox, chochin, plate } from './kit.js';
import { WT, CORRIDOR as C, CHOBA, GENKAN, R } from './layout.js';

export function buildCorridor(ctx) {
  const { hits } = ctx;
  const floorTex = T.floorBoardsTexture();
  floorTex.repeat.set((C.x1 - C.x0) / 3.2, 1);
  slab(C.x0, C.x1, -0.06, 0, C.z0, C.z1, std({ map: floorTex, roughness: 0.32, color: 0xa08060 }), { cast: false });
  slab(C.x0 - WT, C.x1 + WT, C.ceil, C.ceil + 0.06, C.z0 - WT, C.z1 + WT, std({ map: T.woodMap('cedar', { rotate: true, repeat: [1, 8] }), roughness: 0.75, color: 0x8a7458 }));
  for (let x = C.x0 + 0.6; x < C.x1; x += 0.6) slab(x - 0.015, x + 0.015, C.ceil - 0.03, C.ceil, C.z0, C.z1, M.dark, { cast: false });

  // 北側の壁（客室のあいだ）
  wall(C.x0, -1.92, 0, 2.4, 1.8, C.z0);
  wall(1.92, 2.72, 0, 2.4, 1.8, C.z0);
  wall(10.4, C.x1, 0, 2.4, 1.8, C.z0);
  // 西の突き当たりは階段、東の突き当たりは渡り廊下へ続く（壁はない）
  slab(C.x0 - 0.02, C.x0 + 0.02, 1.86, C.ceil, C.z0, C.z1, M.beam);
  slab(C.x1 - 0.02, C.x1 + 0.02, 1.95, C.ceil, C.z0, C.z1, M.beam);
  // 南側の壁。帳場と玄関の口が開いている
  const [c0, c1] = CHOBA.open;
  const [g0, g1] = GENKAN.open;
  wall(C.x0, c0, 0, C.ceil, C.z1, C.z1 + WT);
  wall(c1, g0, 0, C.ceil, C.z1, C.z1 + WT);
  wall(g1, C.x1, 0, C.ceil, C.z1, C.z1 + WT);
  slab(c0, c1, 1.9, C.ceil, C.z1 - 0.02, C.z1 + WT, M.beam);
  slab(g0, g1, 1.9, C.ceil, C.z1 - 0.02, C.z1 + WT, M.beam);
  // 暖簾（帳場の口）
  const noren = std({ color: 0x1d2438, roughness: 0.95, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5, 1, 6), noren);
    n.position.set(c0 + 0.55 + i * 1.05, 1.65, C.z1 + 0.04);
    n.castShadow = true;
    ctx.scene.add(n);
    ctx.sway.push({ mesh: n, seed: i * 1.7 });
  }
  // 柱と鴨居の通り
  for (const x of [C.x0 + 0.06, -1.92, 1.92, 2.72, 6.56, 10.4, C.x1 - 0.06]) box(0.11, 2.3, 0.11, M.pillar, x, 1.15, C.z0 + 0.03);
  for (const x of [C.x0 + 0.06, c0, c1, g0, g1, C.x1 - 0.06, 4.0]) box(0.11, 2.3, 0.11, M.pillar, x, 1.15, C.z1 - 0.03);
  slab(C.x0, C.x1, 1.86, 1.94, C.z0, C.z0 + 0.04, M.beam);
  slab(C.x0, c0, 1.86, 1.94, C.z1 - 0.04, C.z1, M.beam);
  slab(c1, g0, 1.86, 1.94, C.z1 - 0.04, C.z1, M.beam);
  slab(g1, C.x1, 1.86, 1.94, C.z1 - 0.04, C.z1, M.beam);
  slab(C.x0, C.x1, 0, 0.05, C.z0, C.z0 + 0.02, M.dark, { cast: false });

  // 提灯
  const lanterns = [];
  [-0.6, 3.0, 6.6, 9.9].forEach((x, i) => {
    const l = chochin(x, 1.98, 2.72);
    const lamp = ctx.addLamp({ pos: new THREE.Vector3(x, 1.9, 2.72), color: 0xff8536, base: 4.2, distance: 7, paper: l.paper.material, paperBase: 1.7, kind: 'lantern', zone: 'corridor' });
    lanterns.push({ ...l, lamp, i });
    ctx.sway.push({ mesh: l.group, seed: i * 2.3, lantern: true });
  });

  // 部屋札
  plate(T.namePlate('椿'), 1.22, 1.55, C.z0 + 0.01);
  plate(T.namePlate('菖蒲'), 5.86, 1.55, C.z0 + 0.01);
  plate(T.namePlate('桔梗'), 7.26, 1.55, C.z0 + 0.01);
  plate(T.namePlate('帳場'), c1 + 0.3, 1.55, C.z1 - 0.01).rotation.y = Math.PI;
  const H = {
    plateTsubaki: hitBox(hits, 'plateTsubaki', 0.25, 0.4, 0.1, 1.22, 1.55, C.z0 + 0.03),
    plateShobu: hitBox(hits, 'plateShobu', 0.25, 0.4, 0.1, 5.86, 1.55, C.z0 + 0.03),
    plateKikyo: hitBox(hits, 'plateKikyo', 0.25, 0.4, 0.1, 7.26, 1.55, C.z0 + 0.03),
  };

  ctx.walk.push({ r: [C.x0 - 0.1, C.x1 + 0.1, C.z0 + R, C.z1 - R] });
  ctx.zones.push({ name: 'corridor', r: [C.x0, C.x1, 1.86, C.z1 + 0.06] });
  return { lanterns, H };
}
