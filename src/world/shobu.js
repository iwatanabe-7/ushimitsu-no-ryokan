// 3 菖蒲の間。前の客の荷物と日記、鏡台（驚かせ1）
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as T from '../core/textures.js';
import { std, M, box, slab, hitBox, tatami, roomShell, andon, fuzukue } from './kit.js';
import { SHOBU as S, sixMats, R } from './layout.js';
import { cardMaterials } from './tsubaki.js';

export function buildShobu(ctx) {
  const { scene, hits } = ctx;
  tatami(sixMats(S.x0, S.z0), 0.6);
  const tex = T.fusumaTexture({ seed: 37 });
  const door = roomShell({ x0: S.x0, x1: S.x1, z0: S.z0, z1: S.z1, doorCx: S.door, tex });

  // 掛け軸
  const kj = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.2), std({ map: T.kakejikuTexture('shobu'), roughness: 0.85 }));
  kj.position.set(4.75, 1.35, S.z0 + 0.012);
  kj.receiveShadow = true;
  scene.add(kj);

  // 鏡台
  const KX = 3.45, KZ = S.z0 + 0.2;
  const kyodai = new THREE.Group();
  kyodai.position.set(KX, 0, KZ);
  const wood = std({ map: T.woodMap('dark'), roughness: 0.3, color: 0x7a5038 });
  box(0.52, 0.42, 0.3, wood, 0, 0.21, 0, { parent: kyodai });
  for (let i = 0; i < 2; i++) {
    box(0.46, 0.005, 0.005, M.lacquer, 0, 0.14 + i * 0.14, 0.152, { parent: kyodai, cast: false });
    box(0.05, 0.012, 0.02, M.brass, 0, 0.08 + i * 0.14, 0.16, { parent: kyodai });
  }
  for (const s of [-1, 1]) box(0.03, 1.2, 0.03, wood, s * 0.24, 0.98, -0.05, { parent: kyodai });
  box(0.52, 0.03, 0.04, wood, 0, 1.585, -0.05, { parent: kyodai });
  box(0.5, 0.86, 0.02, wood, 0, 1.15, -0.075, { parent: kyodai });
  // 鏡掛けの布（めくり上げてある）
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.03), std({ color: 0x5a2a6a, roughness: 0.9 }));
  cloth.position.set(0, 1.66, -0.05);
  kyodai.add(cloth);
  scene.add(kyodai);
  const mirror = new Reflector(new THREE.PlaneGeometry(0.42, 0.78), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 880,
    color: 0xb4b2a8,
  });
  mirror.position.set(KX, 1.16, KZ - 0.06);
  scene.add(mirror);

  const shobuCard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.128), cardMaterials('shobu'));
  shobuCard.visible = false;
  scene.add(shobuCard);

  // 文机と日記の切れ端
  fuzukue(5.35, S.z0 + 0.25);
  const diaryTex = T.paperScrap(['二月二日', '山で道に迷い', 'この宿に泊まる', '女将は宿帳に', '名前を書けと', '何度も言う'], { seed: 131 });
  const diary = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), std({ map: diaryTex, roughness: 0.9, side: THREE.DoubleSide }));
  diary.rotation.x = -Math.PI / 2;
  diary.rotation.z = 0.2;
  diary.position.set(5.3, 0.317, S.z0 + 0.26);
  diary.receiveShadow = true;
  scene.add(diary);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), std({ color: 0x101010, roughness: 0.3 }));
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.5;
  pen.position.set(5.5, 0.32, S.z0 + 0.3);
  scene.add(pen);

  // 旅行鞄
  const bag = new THREE.Group();
  const leather = std({ map: T.leatherTexture(), roughness: 0.55 });
  box(0.55, 0.32, 0.2, leather, 0, 0.16, 0, { parent: bag });
  box(0.56, 0.02, 0.21, std({ color: 0x2a1a0c, roughness: 0.5 }), 0, 0.2, 0, { parent: bag });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), leather);
  handle.position.y = 0.32;
  bag.add(handle);
  for (const s of [-1, 1]) box(0.04, 0.03, 0.03, M.brass, s * 0.18, 0.28, 0.1, { parent: bag });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), std({ color: 0xd8ccb0, side: THREE.DoubleSide }));
  tag.position.set(0.12, 0.27, 0.105);
  tag.rotation.z = 0.3;
  bag.add(tag);
  bag.position.set(6.05, 0, 0.75);
  bag.rotation.y = -0.4;
  scene.add(bag);

  // 畳まれた布団
  const futon = std({ map: T.futonTexture('cover'), roughness: 0.92, color: 0x8a90a8 });
  for (let i = 0; i < 3; i++) box(0.75, 0.13, 0.95, i === 1 ? std({ color: 0xcfc8ba, roughness: 0.95 }) : futon, 3.3, 0.065 + i * 0.13, 1.25);

  // 行灯
  const a = andon(6.12, S.z0 + 0.3);
  const andonLamp = ctx.addLamp({ pos: new THREE.Vector3(6.12, 0.5, S.z0 + 0.3), color: 0xff9a50, base: 4.6, paper: a.paper.material, paperBase: 1.3, kind: 'andon', zone: 'shobu' });

  const H = {
    mirror: hitBox(hits, 'mirror', 0.6, 1.6, 0.4, KX, 0.8, KZ),
    diary: hitBox(hits, 'diary', 0.4, 0.2, 0.3, 5.3, 0.33, S.z0 + 0.26),
    bag: hitBox(hits, 'bag', 0.62, 0.45, 0.35, 6.05, 0.2, 0.75, -0.4),
    shobuScroll: hitBox(hits, 'shobuScroll', 0.5, 1.3, 0.1, 4.75, 1.35, S.z0 + 0.04),
    shobuFuton: hitBox(hits, 'shobuFuton', 0.8, 0.45, 1.0, 3.3, 0.2, 1.25),
    andon: hitBox(hits, 'andon', 0.42, 0.9, 0.42, 6.12, 0.45, S.z0 + 0.3),
    shobuDoor: hitBox(hits, 'shobuDoor', 1.8, 1.8, 0.1, S.door, 0.9, S.z1 + 0.06),
  };

  ctx.walk.push({ r: [S.x0 + R, S.x1 - R, S.z0 + R, S.z1 - R] });
  ctx.walk.push({ r: [door.gapX[0] + R, door.gapX[1] - R, 1.4, 2.3], when: () => ctx.state.shobuAnim > 0.85 });
  ctx.block.push({ r: [KX - 0.26 - R, KX + 0.26 + R, S.z0, KZ + 0.15 + R] });
  ctx.block.push({ r: [4.95 - R, 5.75 + R, S.z0, S.z0 + 0.45 + R] });
  ctx.block.push({ c: [6.05, 0.75, 0.25 + R] });
  ctx.block.push({ r: [2.9, 3.68 + R, 0.77 - R, 1.73 + R] });
  ctx.block.push({ c: [6.12, S.z0 + 0.3, 0.17 + R] });
  ctx.zones.push({ name: 'shobu', r: [S.x0, S.x1, S.z0, S.z1 + 0.06] });

  return { H, door, mirror, andonLamp, shobuCard, mirrorPos: new THREE.Vector3(KX, 1.16, KZ), doorPos: new THREE.Vector3(S.door + 0.4, 0.9, S.z1) };
}
