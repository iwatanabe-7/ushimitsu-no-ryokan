// 4 桔梗の間。開かずの間だった娘の部屋。札入れ2か所で開く
import * as THREE from 'three';
import * as T from '../core/textures.js';
import { std, M, box, slab, hitBox, tatami, roomShell, fuzukue } from './kit.js';
import { KIKYO as K, sixMats, R } from './layout.js';
import { cardMaterials } from './tsubaki.js';

export function buildKikyo(ctx) {
  const { scene, hits } = ctx;
  tatami(sixMats(K.x0, K.z0), 0.56);
  const tex = T.fusumaTexture({ seed: 39, karakami: true });
  const door = roomShell({ x0: K.x0, x1: K.x1, z0: K.z0, z1: K.z1, doorCx: K.door, tex, tint: 0xa898a0 });

  // 廊下側の札入れ
  const plaque = new THREE.Group();
  plaque.position.set(9.72, 1.18, K.z1 + 0.135);
  box(0.24, 0.2, 0.025, std({ map: T.woodMap('dark'), roughness: 0.35, color: 0x7a5a40 }), 0, 0, 0, { parent: plaque });
  const slotCards = [];
  ['tsubaki', 'shobu'].forEach((kind, i) => {
    box(0.07, 0.11, 0.006, M.lacquer, -0.055 + i * 0.11, 0, 0.014, { parent: plaque, cast: false });
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.096, 0.003), cardMaterials(kind));
    c.rotation.x = Math.PI / 2;
    c.position.set(-0.055 + i * 0.11, 0, 0.018);
    c.visible = false;
    plaque.add(c);
    slotCards.push(c);
  });
  scene.add(plaque);

  // 娘の文机
  const DX = 9.35, DZ = K.z0 + 0.25;
  fuzukue(DX, DZ);
  box(0.1, 0.02, 0.16, std({ color: 0x1a1a1c, roughness: 0.25 }), DX + 0.22, 0.325, DZ);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.128), cardMaterials('kikyo'));
  card.position.set(DX - 0.1, 0.318, DZ + 0.02);
  card.rotation.y = -0.25;
  card.castShadow = true;
  scene.add(card);
  const letterTex = T.paperScrap(['お母さんへ'], { seed: 141, tint: '#e8e0cc' });
  const letter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.003, 0.2), [M.dark, M.dark, std({ map: letterTex, roughness: 0.9 }), M.dark, M.dark, M.dark]);
  letter.position.set(DX - 0.25, 0.318, DZ - 0.02);
  letter.rotation.y = 0.1;
  letter.visible = false;
  scene.add(letter);
  // 灯明（ろうそく）
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.12, 12), std({ color: 0xe8e0d0, roughness: 0.6 }));
  candle.position.set(DX + 0.3, 0.375, DZ - 0.08);
  scene.add(candle);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
  flame.scale.set(1, 2.2, 1);
  flame.position.set(DX + 0.3, 0.455, DZ - 0.08);
  scene.add(flame);
  const candleMat = new THREE.MeshStandardMaterial({ emissive: 0xffa040, emissiveIntensity: 2 });
  ctx.addLamp({ pos: new THREE.Vector3(DX + 0.3, 0.5, DZ - 0.04), color: 0xff9a4a, base: 2.8, paper: candleMat, paperBase: 2, kind: 'candle', zone: 'kikyo', flame });

  // 衣桁と着物
  const ik = new THREE.Group();
  ik.position.set(7.45, 0, K.z0 + 0.45);
  ik.rotation.y = 0.25;
  const lac = std({ color: 0x2a0a08, roughness: 0.3 });
  for (const s of [-0.75, 0.75]) {
    box(0.04, 1.62, 0.04, lac, s, 0.81, 0, { parent: ik });
    box(0.04, 0.03, 0.35, lac, s, 0.02, 0, { parent: ik });
  }
  box(1.62, 0.04, 0.04, lac, 0, 1.6, 0, { parent: ik });
  box(1.5, 0.03, 0.03, lac, 0, 1.2, 0, { parent: ik });
  const kimonoMat = std({ map: T.kimonoTexture(), roughness: 0.85, side: THREE.DoubleSide });
  box(1.45, 0.42, 0.015, kimonoMat, 0, 1.38, 0.03, { parent: ik });
  box(0.6, 1.0, 0.015, kimonoMat, 0, 0.9, 0.03, { parent: ik });
  box(0.62, 0.08, 0.017, std({ color: 0xc8b060, roughness: 0.6 }), 0, 1.12, 0.035, { parent: ik });
  scene.add(ik);

  // 手鞠
  const temari = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), std({ map: T.temariTexture(), roughness: 0.8 }));
  temari.position.set(8.2, 0.07, 0.75);
  temari.castShadow = true;
  scene.add(temari);

  // 市松人形。見ていないうちに、こちらを向く
  const doll = new THREE.Group();
  const kimonoRed = std({ color: 0x8a1a1e, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.24, 16), kimonoRed);
  body.position.y = 0.12;
  doll.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), std({ color: 0xeee6da, roughness: 0.4 }));
  head.position.y = 0.3;
  doll.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), std({ color: 0x050505, roughness: 0.6 }));
  hair.position.y = 0.305;
  hair.rotation.x = -0.25;
  doll.add(hair);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), std({ color: 0x050505 }));
    eye.position.set(s * 0.02, 0.305, 0.05);
    doll.add(eye);
  }
  doll.traverse((o) => (o.castShadow = true));
  doll.position.set(10.0, 0, 1.45);
  doll.rotation.y = -2.4;
  scene.add(doll);

  const H = {
    kikyoDoor: hitBox(hits, 'kikyoDoor', 2.4, 1.8, 0.1, K.door + 0.25, 0.9, K.z1 + 0.16),
    kikyoDesk: hitBox(hits, 'kikyoDesk', 0.8, 0.4, 0.42, DX, 0.25, DZ),
    kimono: hitBox(hits, 'kimono', 1.6, 1.6, 0.25, 7.45, 0.9, K.z0 + 0.45, 0.25),
    temari: hitBox(hits, 'temari', 0.2, 0.2, 0.2, 8.2, 0.08, 0.75),
    doll: hitBox(hits, 'doll', 0.25, 0.4, 0.25, 10.0, 0.18, 1.45),
  };

  ctx.walk.push({ r: [K.x0 + R, K.x1 - R, K.z0 + R, K.z1 - R] });
  ctx.walk.push({ r: [door.gapX[0] + R, door.gapX[1] - R, 1.4, 2.3], when: () => ctx.state.kikyoAnim > 0.85 });
  ctx.block.push({ r: [DX - 0.4 - R, DX + 0.4 + R, K.z0, DZ + 0.2 + R] });
  ctx.block.push({ r: [6.6, 8.3 + R * 0.5, K.z0, K.z0 + 0.7 + R] });
  ctx.block.push({ c: [10.0, 1.45, 0.12 + R] });
  ctx.zones.push({ name: 'kikyo', r: [K.x0, K.x1, K.z0, K.z1 + 0.06] });

  return { H, door, card, letter, doll, slotCards, doorPos: new THREE.Vector3(K.door + 0.4, 0.9, K.z1) };
}
