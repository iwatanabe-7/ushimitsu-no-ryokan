// 女将。設計書どおり「黒い人影」として作る。顔だけがかすかに白い
import * as THREE from 'three';

export function buildOkami({ shadowOnly = false } = {}) {
  const g = new THREE.Group();
  const dark = shadowOnly
    ? new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.88, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.95 });
  // 着物の裾広がりの胴
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const r = 0.27 - t * 0.12 + Math.sin(t * Math.PI) * 0.03 - (t > 0.82 ? (t - 0.82) * 0.6 : 0);
    pts.push(new THREE.Vector2(Math.max(r, 0.06), t * 1.3));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), dark);
  body.scale.set(1, 1, 0.75);
  g.add(body);
  // 帯
  const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.22, 24), shadowOnly ? dark : new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.7 }));
  obi.scale.set(1, 1, 0.75);
  obi.position.y = 0.95;
  g.add(obi);
  // 肩と袖
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), dark);
  sh.scale.set(1.15, 0.45, 0.7);
  sh.position.y = 1.28;
  g.add(sh);
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.22), dark);
    sleeve.position.set(s * 0.2, 1.02, 0.02);
    sleeve.rotation.z = s * 0.12;
    g.add(sleeve);
  }
  // 首・頭・髷
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 12), dark);
  neck.position.y = 1.36;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 16), dark);
  head.scale.set(0.9, 1.1, 0.95);
  head.position.y = 1.47;
  g.add(head);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), dark);
  bun.scale.set(1.3, 0.8, 1);
  bun.position.set(0, 1.58, -0.04);
  g.add(bun);
  let face = null;
  if (!shadowOnly) {
    face = new THREE.Mesh(new THREE.SphereGeometry(0.083, 20, 16, Math.PI / 2 - 0.9, 1.8, Math.PI * 0.22, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 0.6, emissive: 0x6a645a }));
    face.scale.set(0.92, 1.1, 0.98);
    face.position.set(0, 1.465, 0.012);
    g.add(face);
  }
  g.traverse((o) => {
    o.castShadow = !shadowOnly;
  });
  if (!shadowOnly) {
    const faceLight = new THREE.PointLight(0xffb070, 0, 1.6, 2);
    faceLight.position.set(0.1, 1.55, 0.45);
    g.add(faceLight);
    g.userData.faceLight = faceLight;
  }
  g.visible = false;
  return g;
}
