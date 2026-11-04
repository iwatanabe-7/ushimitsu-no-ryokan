// 丑三つの宿 — シーン1「椿の間」
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as T from './textures.js';
import { InnAudio } from './audio.js';
import { MSG, LABEL } from './messages.js';

const $ = (id) => document.getElementById(id);
const audio = new InnAudio();

// ---------------------------------------------------------------- 状態（GameManager 相当）
const state = {
  phase: 'title', // title → intro → wake → play → end
  hasKey: false,
  hasTsubaki: false,
  oshiireOpen: false,
  doorOpen: false,
  doorAnim: 0, // 0..1
  oshiireAnim: 0,
  gameStart: 0, // 時計が動き始めた時刻（秒）
  paused: false,
};

// ---------------------------------------------------------------- レンダラ
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
renderer.setPixelRatio(DPR);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x040405, 0.085);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.03, 40);
camera.rotation.order = 'YXZ';

const rt = new THREE.WebGLRenderTarget(window.innerWidth * DPR, window.innerHeight * DPR, {
  type: THREE.HalfFloatType,
  samples: 4,
});
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.55, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const filmPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fade: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float fade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.85);
      float v = smoothstep(0.78, 0.18, length(d));
      c.rgb *= mix(0.42, 1.0, v);
      float n = h(vUv * vec2(1920.0, 1080.0) + fract(time * 13.7) * 100.0);
      c.rgb += (n - 0.5) * 0.05;
      c.rgb = mix(c.rgb, vec3(dot(c.rgb, vec3(0.299,0.587,0.114))), 0.18);
      c.rgb *= (1.0 - fade);
      gl_FragColor = vec4(c.rgb, 1.0);
    }`,
});
composer.addPass(filmPass);

// ---------------------------------------------------------------- 寸法
const HW = 1.8; // 部屋の半幅（8畳 = 3.6m 四方）
const CEIL = 2.4;
const WT = 0.12; // 壁厚
const EYE = 1.5;

// ---------------------------------------------------------------- 材質
const std = (o) => new THREE.MeshStandardMaterial(o);
function wallMat(w, h) {
  return std({ map: T.wallMap([Math.max(w, 0.3) / 1.3, Math.max(h, 0.3) / 1.3]), roughness: 0.96, color: 0xb8a68a });
}
const woodPillar = std({ map: T.woodMap('pillar'), roughness: 0.55, color: 0xc0a080 });
const woodBeam = std({ map: T.woodMap('pillar', { rotate: true, repeat: [1, 3] }), roughness: 0.55, color: 0xb09070 });
const woodDark = std({ map: T.woodMap('dark', { rotate: true, repeat: [1, 2] }), roughness: 0.45 });
const lacquer = std({ color: 0x0c0806, roughness: 0.28, metalness: 0.1 });
const tokoBoard = std({ map: T.woodMap('toko', { rotate: true, repeat: [1, 1.5] }), roughness: 0.3, color: 0x9a8070 });

function box(w, h, d, mat, x, y, z, { cast = true, receive = true, parent = scene } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}
// 範囲指定で箱を置く
function slab(x0, x1, y0, y1, z0, z1, mat, opt) {
  return box(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, opt);
}
function wall(x0, x1, y0, y1, z0, z1) {
  const w = Math.max(x1 - x0, z1 - z0);
  return slab(x0, x1, y0, y1, z0, z1, wallMat(w, y1 - y0));
}

// ---------------------------------------------------------------- 畳
const tatamiTex = [T.tatamiTexture(1), T.tatamiTexture(2), T.tatamiTexture(3)];
const mats = [
  [-1.8, -0.9, -1.8, 0], [-0.9, 0.9, -1.8, -0.9], [-0.9, 0.9, -0.9, 0], [0.9, 1.8, -1.8, 0],
  [-1.8, -0.9, 0, 1.8], [-0.9, 0.9, 0, 0.9], [-0.9, 0.9, 0.9, 1.8], [0.9, 1.8, 0, 1.8],
];
mats.forEach(([x0, x1, z0, z1], i) => {
  const vertical = x1 - x0 < z1 - z0;
  const t = tatamiTex[i % 3];
  const m = box(0.896, 0.06, 1.796, std({
    map: t, bumpMap: t, bumpScale: 1.2, roughness: 0.82,
    color: new THREE.Color().setHSL(0.13, 0.15, 0.62 + (i % 4) * 0.03),
  }), (x0 + x1) / 2, -0.03, (z0 + z1) / 2, { cast: false });
  if (!vertical) m.rotation.y = Math.PI / 2;
});

// ---------------------------------------------------------------- 壁
// 北（床の間側）
wall(-0.2, HW + WT, 0, CEIL, -HW - WT, -HW);
wall(-HW, -0.2, 1.95, CEIL, -HW - 0.06, -HW); // 床の間の小壁
// 床の間の窪み
wall(-HW, -0.2, 0, CEIL, -2.45 - WT, -2.45);
wall(-0.2, -0.2 + WT, 0, CEIL, -2.45, -HW);
slab(-HW, -0.2, 2.3, 2.36, -2.45, -HW, std({ map: T.woodMap('cedar', { rotate: true }), roughness: 0.7 }));
slab(-HW, -0.2, 0, 0.13, -2.45, -HW, tokoBoard);
slab(-HW, -0.2, 0, 0.14, -1.86, -HW + 0.02, lacquer); // 床框
// 東（押入れ側）
wall(HW, HW + WT, 0, CEIL, -HW - WT, -0.9);
wall(HW, HW + WT, 0, CEIL, 0.9, HW + WT);
wall(HW, HW + WT, 1.8, CEIL, -0.9, 0.9);
// 南（廊下へ出る襖）
wall(-HW - WT, -0.9, 0, CEIL, HW, HW + WT);
wall(0.9, HW + WT, 0, CEIL, HW, HW + WT);
wall(-0.9, 0.9, 1.8, CEIL, HW, HW + WT);
// 西（障子窓）
wall(-HW - WT, -HW, 0, CEIL, -2.45 - WT, -0.9);
wall(-HW - WT, -HW, 0, CEIL, 0.9, HW + WT);
wall(-HW - WT, -HW, 0, 0.75, -0.9, 0.9);
wall(-HW - WT, -HW, 1.85, CEIL, -0.9, 0.9);

// 押入れの中
const oshiireMat = std({ map: T.woodMap('light', { rotate: true, repeat: [1, 2] }), roughness: 0.8, color: 0x8a7a68 });
slab(2.6, 2.7, 0, 1.8, -0.9, 0.9, oshiireMat);
slab(HW, 2.6, 0, 1.8, -1.0, -0.9, oshiireMat);
slab(HW, 2.6, 0, 1.8, 0.9, 1.0, oshiireMat);
slab(HW, 2.7, 1.8, 1.86, -1.0, 1.0, oshiireMat);
slab(HW, 2.6, 0, 0.05, -0.9, 0.9, oshiireMat);
slab(HW, 2.6, 0.74, 0.78, -0.9, 0.9, oshiireMat);
slab(HW + 0.1, HW + 0.16, 0.72, 0.8, -0.9, 0.9, woodPillar); // 中段框

// 天井（竿縁天井）
slab(-HW - WT, HW + WT, CEIL, CEIL + 0.05, -HW - WT, HW + WT, std({ map: T.woodMap('cedar', { rotate: true, repeat: [1, 4] }), roughness: 0.75, color: 0xa08a70 }));
for (let z = -1.35; z < HW; z += 0.45) slab(-HW, HW, CEIL - 0.035, CEIL, z - 0.015, z + 0.015, woodDark, { cast: false });
// 廻縁
slab(-HW, HW, CEIL - 0.05, CEIL, -HW, -HW + 0.05, woodDark, { cast: false });
slab(-HW, HW, CEIL - 0.05, CEIL, HW - 0.05, HW, woodDark, { cast: false });
slab(-HW, -HW + 0.05, CEIL - 0.05, CEIL, -HW, HW, woodDark, { cast: false });
slab(HW - 0.05, HW, CEIL - 0.05, CEIL, -HW, HW, woodDark, { cast: false });

// 柱
const post = (x, z) => box(0.11, CEIL, 0.11, woodPillar, x, CEIL / 2, z);
post(HW, -HW); post(HW, HW); post(-HW, HW);
post(0.9 + 0.0, HW); post(-0.9, HW);
post(HW, -0.9); post(HW, 0.9);
post(-HW, -0.9); post(-HW, 0.9);
post(-HW, -2.45);
// 床柱（皮付きの丸太）
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

// 長押（部屋を一周する横木）
slab(-HW, HW, 1.86, 1.96, -HW, -HW + 0.05, woodBeam);
slab(-HW, HW, 1.86, 1.96, HW - 0.05, HW, woodBeam);
slab(-HW, -HW + 0.05, 1.86, 1.96, -HW, HW, woodBeam);
slab(HW - 0.05, HW, 1.86, 1.96, -HW, HW, woodBeam);
// 鴨居と敷居
slab(-0.9, 0.9, 1.78, 1.86, HW - 0.02, HW + WT, woodBeam);
slab(-0.9, 0.9, 0, 0.02, HW - 0.02, HW + WT, woodBeam, { cast: false });
slab(HW - 0.02, HW + WT, 1.78, 1.86, -0.9, 0.9, woodBeam);
slab(-HW - WT, -HW + 0.02, 1.8, 1.85, -0.9, 0.9, woodBeam);
slab(-HW - WT, -HW + 0.02, 0.72, 0.75, -0.9, 0.9, woodBeam);
// 畳寄せ
slab(-HW, HW, 0, 0.04, -HW, -HW + 0.02, woodDark, { cast: false });
slab(-HW, -0.9, 0, 0.04, HW - 0.02, HW, woodDark, { cast: false });
slab(0.9, HW, 0, 0.04, HW - 0.02, HW, woodDark, { cast: false });

// ---------------------------------------------------------------- 襖
function fusumaPanel(tex, w = 0.9, h = 1.76) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h - 0.04, 0.018), std({ map: tex, roughness: 0.9, color: 0xc8bea6 }));
  paper.castShadow = paper.receiveShadow = true;
  g.add(paper);
  const f = 0.022;
  for (const [fw, fh, fx, fy] of [[w, f, 0, h / 2 - f / 2], [w, f, 0, -h / 2 + f / 2], [f, h, -w / 2 + f / 2, 0], [f, h, w / 2 - f / 2, 0]]) {
    box(fw, fh, 0.026, lacquer, fx, fy, 0, { parent: g });
  }
  // 引手
  const pull = std({ color: 0x2a2014, roughness: 0.35, metalness: 0.6 });
  const hk = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 20), pull);
  hk.rotation.x = Math.PI / 2;
  hk.name = 'pull';
  g.add(hk);
  return { group: g, pull: hk };
}
const doorTex = T.fusumaTexture({ seed: 31, camellia: true });
const doorL = fusumaPanel(doorTex);
doorL.group.position.set(-0.45, 0.9, HW + 0.035);
doorL.pull.position.set(0.36, -0.05, 0);
scene.add(doorL.group);
const doorTexR = doorTex.clone();
doorTexR.repeat.x = -1;
doorTexR.offset.x = 1;
const doorR = fusumaPanel(doorTexR);
doorR.group.position.set(0.45, 0.9, HW + 0.075);
doorR.pull.position.set(-0.36, -0.05, 0);
scene.add(doorR.group);

const oshTex = T.fusumaTexture({ seed: 33, karakami: true });
const oshN = fusumaPanel(oshTex);
oshN.group.rotation.y = Math.PI / 2;
oshN.group.position.set(HW + 0.075, 0.9, -0.45);
oshN.pull.position.set(-0.36, -0.05, 0);
scene.add(oshN.group);
const oshS = fusumaPanel(oshTex);
oshS.group.rotation.y = Math.PI / 2;
oshS.group.position.set(HW + 0.035, 0.9, 0.45);
oshS.pull.position.set(0.36, -0.05, 0);
scene.add(oshS.group);

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

// ---------------------------------------------------------------- 床の間の飾り
const kjTex = T.kakejikuTexture();
const kakejiku = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 1.32), std({ map: kjTex, roughness: 0.85 }));
kakejiku.position.set(-1.0, 1.32, -2.44);
kakejiku.receiveShadow = true;
scene.add(kakejiku);
for (const y of [1.99, 0.655]) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, y > 1 ? 0.46 : 0.52, 10), lacquer);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(-1.0, y, -2.43);
  rod.castShadow = true;
  scene.add(rod);
}
const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.2, 4), std({ color: 0x3a2a14 }));
cord.position.set(-1.0, 2.09, -2.44);
scene.add(cord);

// 花入れと椿
const vase = new THREE.Group();
{
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
  for (const [x, y, z, a] of [[0.05, 0.42, 0.02, 0.6], [-0.02, 0.5, -0.02, -0.8], [0.06, 0.55, -0.02, 0.9], [0.0, 0.36, 0.03, -0.4]]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), leafMat);
    l.scale.set(1.4, 0.18, 0.6);
    l.position.set(x, y, z);
    l.rotation.z = a;
    l.castShadow = true;
    vase.add(l);
  }
  const petal = std({ color: 0x8c0a16, roughness: 0.5 });
  const flower = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), petal);
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.017, 0, Math.sin(a) * 0.017);
    p.scale.set(1, 0.55, 1);
    p.rotation.z = Math.cos(a) * 0.5;
    p.rotation.x = Math.sin(a) * 0.5;
    flower.add(p);
  }
  const stamen = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.006, 0.02, 10), std({ color: 0xd9b340, emissive: 0x3a2a00 }));
  stamen.position.y = 0.012;
  flower.add(stamen);
  flower.position.set(0.055, 0.6, 0.01);
  flower.rotation.z = -0.5;
  flower.rotation.x = 0.3;
  vase.add(flower);
}
vase.position.set(-0.55, 0.13, -2.18);
scene.add(vase);

// 椿の札
const cardTex = T.hanafudaTexture('tsubaki');
const cardBack = std({ color: 0x2a120c, roughness: 0.5 });
const card = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.128), [cardBack, cardBack, std({ map: cardTex, roughness: 0.45 }), cardBack, cardBack, cardBack]);
card.position.set(-1.3, 0.132, -2.05);
card.rotation.y = 0.35;
card.castShadow = card.receiveShadow = true;
scene.add(card);

// ---------------------------------------------------------------- 布団・枕
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

// ---------------------------------------------------------------- 行灯
const ANDON = new THREE.Vector3(1.22, 0, -1.32);
const andon = new THREE.Group();
andon.position.copy(ANDON);
box(0.34, 0.04, 0.34, woodDark, 0, 0.02, 0, { parent: andon });
for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) box(0.022, 0.82, 0.022, woodDark, x, 0.43, z, { parent: andon });
box(0.34, 0.02, 0.34, woodDark, 0, 0.83, 0, { parent: andon, cast: false });
const andonPaper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), std({
  map: T.lanternPaper(), emissiveMap: T.lanternPaper(), emissive: 0xffa04a, emissiveIntensity: 1.4, color: 0x332211, roughness: 0.9,
}));
andonPaper.position.y = 0.56;
andon.add(andonPaper);
// 火皿
box(0.08, 0.02, 0.08, lacquer, 0, 0.32, 0, { parent: andon });
scene.add(andon);
const andonLight = new THREE.PointLight(0xff9447, 3.6, 0, 2);
andonLight.position.set(ANDON.x, 0.5, ANDON.z);
andonLight.castShadow = true;
andonLight.shadow.mapSize.set(1024, 1024);
andonLight.shadow.bias = -0.003;
andonLight.shadow.normalBias = 0.02;
andonLight.shadow.camera.near = 0.15;
scene.add(andonLight);

// ---------------------------------------------------------------- 枕時計
const CLOCK = new THREE.Vector3(0.8, 0, -1.08);
const clock = new THREE.Group();
clock.position.copy(CLOCK);
clock.rotation.y = -0.45;
box(0.16, 0.2, 0.08, std({ map: T.woodMap('dark'), roughness: 0.35, color: 0x8a6a50 }), 0, 0.1, 0, { parent: clock });
const face = T.clockFace();
const faceMesh = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), std({ map: face.texture, emissiveMap: face.texture, emissive: 0x2a2014, emissiveIntensity: 0.5, roughness: 0.25 }));
faceMesh.position.set(0, 0.11, 0.041);
face.texture.repeat.set(1, 1);
clock.add(faceMesh);
const glass = new THREE.Mesh(new THREE.CircleGeometry(0.062, 32), std({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.2 }));
glass.position.set(0, 0.11, 0.043);
clock.add(glass);
scene.add(clock);

// ---------------------------------------------------------------- 座卓と湯呑み
const TABLE = { x: -1.0, z: 1.0 };
const tableMat = std({ map: T.woodMap('toko', { rotate: true }), roughness: 0.22, color: 0x7a5a48 });
box(0.9, 0.035, 0.62, tableMat, TABLE.x, 0.33, TABLE.z);
for (const [dx, dz] of [[-0.4, -0.26], [0.4, -0.26], [-0.4, 0.26], [0.4, 0.26]]) box(0.05, 0.31, 0.05, tableMat, TABLE.x + dx, 0.155, TABLE.z + dz);
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

// ---------------------------------------------------------------- 押入れの中身
const yukata = new THREE.Group();
box(0.42, 0.06, 0.34, std({ map: T.yukataTexture(), roughness: 0.95 }), 0, 0, 0, { parent: yukata });
box(0.42, 0.012, 0.06, std({ color: 0x5a1a1a, roughness: 0.8 }), 0, 0.035, 0.04, { parent: yukata });
yukata.position.set(2.15, 0.81, 0.5);
scene.add(yukata);
for (let i = 0; i < 4; i++) box(0.7, 0.13, 0.75, std({ color: i % 2 ? 0xbfb6a6 : 0x6a4a40, roughness: 0.95 }), 2.2, 0.12 + i * 0.135, 0.45 - (i % 2) * 0.02);
for (let i = 0; i < 3; i++) box(0.7, 0.14, 0.75, std({ color: 0xa89e8c, roughness: 0.95 }), 2.2, 0.85 + i * 0.145, -0.45);

// ---------------------------------------------------------------- 廊下
const corridorFloorTex = T.floorBoardsTexture();
corridorFloorTex.repeat.set(3.8, 1);
slab(-7, 7, -0.06, 0, HW + WT, 3.5, std({ map: corridorFloorTex, roughness: 0.32, color: 0xa08060 }), { cast: false });
slab(-7, 7, 2.3, 2.36, HW + WT, 3.5, std({ map: T.woodMap('cedar', { rotate: true, repeat: [1, 6] }), roughness: 0.75, color: 0x8a7458 }), { cast: false });
wall(-7, 7, 0, 2.3, 3.5, 3.62);
slab(-7, 7, 1.78, 1.86, 3.45, 3.5, woodBeam);
slab(-7, 7, 0, 0.06, 3.47, 3.5, woodDark);
// 向かいの部屋の襖
const otherTex = T.fusumaTexture({ seed: 35, karakami: true });
for (const x of [-4.5, -3.6, 3.2, 4.1]) {
  const p = fusumaPanel(otherTex);
  p.group.rotation.y = Math.PI;
  p.group.position.set(x, 0.9, 3.46);
  scene.add(p.group);
}
for (const x of [-5.0, -3.1, 2.7, 4.6, -1.2, 1.0]) box(0.11, 2.3, 0.11, woodPillar, x, 1.15, 3.47);
// 廊下側の柱と鴨居
for (const x of [-5, -2.5, 2.5, 5]) box(0.11, 2.3, 0.11, woodPillar, x, 1.15, HW + WT + 0.02);

// 提灯
const lanterns = [];
const lanternPaperTex = T.lanternPaper({ ribs: true, kanji: '宿' });
for (const x of [-3.4, 0.6, 4.4]) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 18), std({
    map: lanternPaperTex, emissiveMap: lanternPaperTex, emissive: 0xff8a3a, emissiveIntensity: 1.7, color: 0x331a0a, roughness: 0.9,
  }));
  paper.scale.set(1, 1.4, 1);
  g.add(paper);
  for (const y of [0.23, -0.23]) box(0.15, 0.03, 0.15, lacquer, 0, y, 0, { parent: g, cast: false }).geometry = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.15, 4), lacquer);
  c.position.y = 0.32;
  g.add(c);
  g.position.set(x, 1.98, 2.72);
  scene.add(g);
  const light = new THREE.PointLight(0xff8536, 0, 7, 2);
  light.position.set(x, 1.9, 2.72);
  scene.add(light);
  lanterns.push({ g, paper, light, base: 5, seed: Math.random() * 100 });
}

// ---------------------------------------------------------------- 照明
scene.add(new THREE.HemisphereLight(0x2c3a58, 0x1a120a, 0.55));
// 月光（障子越し）
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

// ---------------------------------------------------------------- 調べられる物（Interactable 相当）
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hits = [];
function hit(id, w, h, d, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.userData.id = id;
  m.userData.enabled = true;
  scene.add(m);
  hits.push(m);
  return m;
}
const H = {
  clock: hit('clock', 0.3, 0.3, 0.3, CLOCK.x, 0.12, CLOCK.z),
  andon: hit('andon', 0.42, 0.9, 0.42, ANDON.x, 0.45, ANDON.z),
  futon: hit('futon', 0.95, 0.2, 1.7, 0.25, 0.1, -0.05),
  table: hit('table', 0.95, 0.45, 0.7, TABLE.x, 0.22, TABLE.z),
  door: hit('door', 1.8, 1.8, 0.1, 0, 0.9, HW + 0.04),
  oshiire: hit('oshiire', 0.1, 1.8, 1.8, HW + 0.04, 0.9, 0),
  oshiireInner: hit('oshiireInner', 0.6, 0.7, 0.8, 2.15, 0.35, 0.5),
  yukata: hit('yukata', 0.5, 0.25, 0.45, 2.1, 0.85, 0.5),
  kakejiku: hit('kakejiku', 0.5, 1.35, 0.1, -1.0, 1.32, -2.42),
  vase: hit('vase', 0.22, 0.75, 0.22, -0.55, 0.45, -2.18),
  card: hit('card', 0.28, 0.12, 0.3, -1.3, 0.16, -2.05),
  shoji: hit('shoji', 0.1, 1.1, 1.8, -HW - 0.04, 1.3, 0),
};
H.oshiireInner.userData.enabled = false;
H.yukata.userData.enabled = false;

// ---------------------------------------------------------------- 時計（InnClock 相当）
// 実時間1分でゲーム内2分。2:30 で止まる。
function gameTime(now) {
  if (!state.gameStart) return { h: 2, m: 0, s: 0, stopped: false };
  const gameSec = Math.min((now - state.gameStart) * 2, 30 * 60);
  return { h: 2, m: Math.floor(gameSec / 60), s: Math.floor(gameSec % 60), stopped: gameSec >= 30 * 60 };
}
let lastTick = -1;
let lastDrawn = -1;

// ---------------------------------------------------------------- UI
const ui = {
  title: $('title'),
  intro: $('intro'),
  introLine: $('introLine'),
  msg: $('msg'),
  msgText: $('msgText'),
  prompt: $('prompt'),
  promptLabel: $('promptLabel'),
  inv: $('inv'),
  pause: $('pause'),
  end: $('end'),
  touch: $('touch'),
  act: $('act'),
  reticle: $('reticle'),
};

let msgQueue = [];
let msgDone = null;
let typing = null;
function say(lines, done) {
  msgQueue = [...lines];
  msgDone = done || null;
  ui.msg.hidden = false;
  nextLine();
}
function nextLine() {
  if (typing) {
    clearInterval(typing.id);
    ui.msgText.textContent = typing.full;
    typing = null;
    return;
  }
  if (!msgQueue.length) {
    ui.msg.hidden = true;
    const d = msgDone;
    msgDone = null;
    d && d();
    return;
  }
  const full = msgQueue.shift();
  let i = 0;
  ui.msgText.textContent = '';
  const id = setInterval(() => {
    i++;
    ui.msgText.textContent = full.slice(0, i);
    if (i >= full.length) {
      clearInterval(id);
      typing = null;
    }
  }, 38);
  typing = { id, full };
}
const talking = () => !ui.msg.hidden;

function addItem(id, name, drawIcon) {
  const el = document.createElement('div');
  el.className = 'item';
  el.dataset.id = id;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 96;
  drawIcon(c.getContext('2d'));
  const label = document.createElement('span');
  label.textContent = name;
  el.append(c, label);
  ui.inv.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
}
function iconKey(x) {
  x.strokeStyle = '#c9a86a';
  x.fillStyle = '#c9a86a';
  x.lineWidth = 5;
  x.beginPath();
  x.arc(32, 26, 12, 0, Math.PI * 2);
  x.stroke();
  x.fillRect(29, 37, 6, 44);
  x.fillRect(35, 62, 12, 5);
  x.fillRect(35, 74, 9, 5);
  x.fillStyle = '#6a1a14';
  x.fillRect(22, 8, 20, 3);
}
function iconCard(x) {
  x.drawImage(cardTex.image, 4, 2, 56, 90);
}

// ---------------------------------------------------------------- 入力
const keys = {};
let yaw = Math.PI + 0.35;
let pitch = 0;
const isTouch = window.matchMedia('(pointer: coarse)').matches;
let locked = false;

function requestLock() {
  if (isTouch) return;
  try {
    const p = canvas.requestPointerLock?.();
    p?.catch?.(() => {});
  } catch (_) { /* ポインタロック不可の環境ではドラッグで視点操作 */ }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && state.phase === 'play' && !talking() && !isTouch) {
    state.paused = true;
    ui.pause.hidden = false;
  }
});
ui.pause.addEventListener('click', () => {
  state.paused = false;
  ui.pause.hidden = true;
  requestLock();
});

let dragging = false;
canvas.addEventListener('mousedown', () => {
  if (state.phase !== 'play') return;
  if (!locked) requestLock();
  dragging = true;
});
window.addEventListener('mouseup', () => (dragging = false));
window.addEventListener('mousemove', (e) => {
  if (state.phase !== 'play' || state.paused) return;
  if (!locked && !dragging) return;
  const s = 0.0022;
  yaw -= e.movementX * s;
  pitch -= e.movementY * s;
  pitch = Math.max(-1.22, Math.min(1.22, pitch));
});

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    act();
  }
  if (e.code === 'Escape' && talking()) nextLine();
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));
window.addEventListener('blur', () => Object.keys(keys).forEach((k) => (keys[k] = false)));

// タッチ操作：左半分で移動、右半分で視点
const touchMove = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const touchLook = { id: null, x: 0, y: 0 };
if (isTouch) {
  ui.touch.hidden = false;
  const stick = $('stick');
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth / 2 && touchMove.id === null) {
        Object.assign(touchMove, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: 0, y: 0 });
        stick.style.left = t.clientX + 'px';
        stick.style.top = t.clientY + 'px';
        stick.hidden = false;
      } else if (touchLook.id === null) {
        Object.assign(touchLook, { id: t.identifier, x: t.clientX, y: t.clientY });
      }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchMove.id) {
        const dx = t.clientX - touchMove.ox, dy = t.clientY - touchMove.oy;
        const l = Math.min(1, Math.hypot(dx, dy) / 50);
        const a = Math.atan2(dy, dx);
        touchMove.x = Math.cos(a) * l;
        touchMove.y = Math.sin(a) * l;
        stick.firstElementChild.style.transform = `translate(${touchMove.x * 28}px, ${touchMove.y * 28}px)`;
      } else if (t.identifier === touchLook.id) {
        yaw -= (t.clientX - touchLook.x) * 0.006;
        pitch -= (t.clientY - touchLook.y) * 0.006;
        pitch = Math.max(-1.22, Math.min(1.22, pitch));
        touchLook.x = t.clientX;
        touchLook.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchMove.id) {
        touchMove.id = null;
        touchMove.x = touchMove.y = 0;
        stick.hidden = true;
        stick.firstElementChild.style.transform = '';
      }
      if (t.identifier === touchLook.id) touchLook.id = null;
    }
  };
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', end);
  ui.act.addEventListener('click', act);
}
ui.msg.addEventListener('click', () => talking() && nextLine());

// ---------------------------------------------------------------- 調べる
const ray = new THREE.Raycaster();
ray.far = 2.3;
const center = new THREE.Vector2(0, 0);
let focus = null;

function updateFocus() {
  focus = null;
  ui.reticle.classList.remove('on');
  if (state.phase !== 'play' || talking()) {
    ui.prompt.hidden = true;
    return;
  }
  ray.setFromCamera(center, camera);
  const res = ray.intersectObjects(hits.filter((h) => h.userData.enabled), false);
  if (res.length) focus = res[0].object.userData.id;
  ui.prompt.hidden = !focus;
  if (focus) {
    ui.promptLabel.textContent = LABEL[focus];
    ui.reticle.classList.add('on');
  }
}

function act() {
  if (state.phase === 'title') return;
  if (state.phase === 'intro') return skipIntro();
  if (talking()) return nextLine();
  if (state.phase !== 'play' || !focus) return;
  const id = focus;
  switch (id) {
    case 'clock': {
      const t = gameTime(performance.now() / 1000);
      say(t.stopped ? MSG.clockStopped : MSG.clock(`${t.h}時${String(t.m).padStart(2, '0')}分`));
      break;
    }
    case 'door':
      if (!state.hasKey) say(MSG.doorLocked);
      else {
        audio.unlock(new THREE.Vector3(0.4, 0.9, HW));
        say(MSG.doorUnlock, openDoor);
      }
      break;
    case 'oshiire':
      openOshiire();
      break;
    case 'oshiireInner':
      say(MSG.oshiireInner);
      break;
    case 'yukata':
      if (state.hasKey) say(MSG.yukataEmpty);
      else {
        state.hasKey = true;
        audio.pickup();
        say(MSG.yukata, () => {
          addItem('key', '廊下の鍵', iconKey);
          setTimeout(passingShadow, 1600);
        });
      }
      break;
    case 'card':
      state.hasTsubaki = true;
      audio.pickup();
      card.visible = false;
      H.card.userData.enabled = false;
      say(MSG.card, () => addItem('tsubaki', '椿の札', iconCard));
      break;
    default:
      say(MSG[id]);
  }
}

function openOshiire() {
  if (state.oshiireOpen) return;
  state.oshiireOpen = true;
  audio.slide(new THREE.Vector3(HW, 0.9, 0.3), 0.8, 0.3);
  H.oshiire.userData.enabled = false;
  setTimeout(() => {
    H.oshiireInner.userData.enabled = true;
    H.yukata.userData.enabled = true;
  }, 700);
}

function openDoor() {
  state.doorOpen = true;
  H.door.userData.enabled = false;
  audio.slide(new THREE.Vector3(0.4, 0.9, HW), 1.1, 0.4);
  for (const l of lanterns) l.light.visible = true;
}

// 鍵を取った直後：襖の向こうを誰かが通り過ぎる
let shadowPass = -1;
function passingShadow() {
  shadowPass = performance.now() / 1000;
  audio.creak(new THREE.Vector3(2.5, 0.2, 2.6), 0.3, 0.9);
  for (let i = 0; i < 6; i++) {
    setTimeout(() => audio.stepWood(new THREE.Vector3(2.6 - i * 1.0, 0, 2.7), 0.45), 700 + i * 640);
  }
}

// ---------------------------------------------------------------- 移動と当たり判定（PlayerController 相当）
const R = 0.22;
function inRect(x, z, [x0, x1, z0, z1]) {
  return x >= x0 && x <= x1 && z >= z0 && z <= z1;
}
let needCardShown = 0;
function walkable(x, z) {
  // 座卓と行灯
  if (inRect(x, z, [TABLE.x - 0.45 - R, TABLE.x + 0.45 - 0.05, TABLE.z - 0.31 - R, TABLE.z + 0.31 + R])) return false;
  if (Math.hypot(x - ANDON.x, z - ANDON.z) < 0.17 + R) return false;
  if (inRect(x, z, [-HW + R, HW - R, -HW + R, HW - R])) return true;
  if (state.doorAnim > 0.85) {
    if (inRect(x, z, [0.1 + R, 0.9 - R, 1.4, 2.3])) return true;
    if (inRect(x, z, [-6.8, 6.8, HW + WT + R, 3.5 - R])) return true;
  }
  return false;
}

const pos = new THREE.Vector3(0.3, EYE, -0.45);
let stepAcc = 0;
let lastMoving = false;
let stillTime = 0;
let echoArmed = false;
let corridorTime = 0;
let shownCorridor = false;

function movePlayer(dt) {
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyA || keys.ArrowLeft) s -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1;
  f -= touchMove.y;
  s += touchMove.x;
  const len = Math.hypot(f, s);
  if (len > 1) {
    f /= len;
    s /= len;
  }
  const speed = 1.7;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const dx = (-sin * f + cos * s) * speed * dt;
  const dz = (-cos * f - sin * s) * speed * dt;
  const before = pos.clone();
  if (walkable(pos.x + dx, pos.z)) pos.x += dx;
  // 床の間の札を取るまでは廊下に出られない
  const blockZ = !state.hasTsubaki && dz > 0 && pos.z + dz > HW - R;
  if (!blockZ && walkable(pos.x, pos.z + dz)) pos.z += dz;
  else if (blockZ && state.doorAnim > 0.85 && pos.x > 0.25 && pos.x < 0.75) {
    const now = performance.now();
    if (now - needCardShown > 6000) {
      needCardShown = now;
      say(MSG.needCard);
    }
  }

  const moved = before.distanceTo(pos);
  const inCorridor = pos.z > HW + 0.05;
  stepAcc += moved;
  if (stepAcc > 0.62) {
    stepAcc = 0;
    if (inCorridor) audio.stepWood(new THREE.Vector3(pos.x, 0, pos.z), 0.28);
    else audio.stepTatami();
  }
  // 足音の残響（FootstepEcho）：廊下で止まると、少し遅れてもう一歩
  const moving = moved > 0.0005;
  if (moving) {
    stillTime = 0;
    if (inCorridor) echoArmed = true;
  } else {
    stillTime += dt;
    if (echoArmed && stillTime > 0.38) {
      echoArmed = false;
      const back = new THREE.Vector3(Math.sin(yaw) * 1.6, 0, Math.cos(yaw) * 1.6).add(pos);
      audio.stepWood(back, 0.4);
    }
  }
  lastMoving = moving;
  return { moved, inCorridor };
}

// ---------------------------------------------------------------- 進行
function startGame() {
  audio.start();
  ui.title.classList.add('out');
  setTimeout(() => (ui.title.hidden = true), 1200);
  state.phase = 'intro';
  playIntro();
}
let introTimer = null;
let introIdx = 0;
function playIntro() {
  ui.intro.hidden = false;
  introIdx = 0;
  const show = () => {
    if (introIdx >= MSG.intro.length) return finishIntro();
    ui.introLine.classList.remove('in');
    setTimeout(() => {
      ui.introLine.textContent = MSG.intro[introIdx];
      ui.introLine.classList.add('in');
      introIdx++;
      introTimer = setTimeout(show, 3600);
    }, 500);
  };
  show();
}
function skipIntro() {
  clearTimeout(introTimer);
  introIdx++;
  if (introIdx >= MSG.intro.length + 1) return finishIntro();
  ui.introLine.textContent = MSG.intro[Math.min(introIdx - 1, MSG.intro.length - 1)];
  introTimer = setTimeout(() => {
    if (introIdx >= MSG.intro.length) finishIntro();
    else skipIntro();
  }, 2200);
}
function finishIntro() {
  if (state.phase !== 'intro') return;
  clearTimeout(introTimer);
  ui.intro.classList.add('out');
  setTimeout(() => (ui.intro.hidden = true), 1500);
  state.phase = 'wake';
  wakeStart = performance.now() / 1000;
  audio.drone(6, 0.06);
}
let wakeStart = 0;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

function wake(now) {
  const t = Math.min(1, (now - wakeStart) / 4.2);
  filmPass.uniforms.fade.value = Math.max(0, 1 - t * 2.2);
  // 仰向け → 起き上がる → 立つ
  const a = ease(Math.min(1, t * 1.8));
  const b = ease(Math.max(0, (t - 0.5) / 0.5));
  camera.position.set(lerp(0.25, 0.3, b), lerp(0.22, lerp(0.85, EYE, b), a), lerp(-0.92, -0.45, a));
  const p = lerp(1.35, lerp(0.05, 0, b), a);
  const y = lerp(Math.PI, Math.PI + 0.35, b);
  camera.rotation.set(p, y, 0);
  if (t >= 1) {
    yaw = Math.PI + 0.35;
    pitch = 0;
    state.phase = 'play';
    state.gameStart = now;
    say(MSG.wake);
    requestLock();
  }
}

function endScene() {
  state.phase = 'end';
  document.exitPointerLock?.();
  const t0 = performance.now() / 1000;
  const fade = () => {
    const t = performance.now() / 1000 - t0;
    filmPass.uniforms.fade.value = Math.min(1, t / 2.5);
    if (t < 2.5) requestAnimationFrame(fade);
    else ui.end.hidden = false;
  };
  fade();
}
$('start').addEventListener('click', startGame);
$('again').addEventListener('click', () => location.reload());

// ---------------------------------------------------------------- 毎フレーム
const clockPos = new THREE.Vector3(CLOCK.x, 0.12, CLOCK.z);
let prev = performance.now() / 1000;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - prev);
  prev = now;
  filmPass.uniforms.time.value = now;

  // 行灯の揺らぎ
  const fl = 0.86 + Math.sin(now * 7.3) * 0.05 + Math.sin(now * 13.1 + 1) * 0.04 + (Math.random() - 0.5) * 0.06;
  andonLight.intensity = 3.6 * fl;
  andonPaper.material.emissiveIntensity = 1.4 * fl;

  // 提灯
  const doorT = state.doorAnim;
  lanterns.forEach((l, i) => {
    const f = 0.9 + Math.sin(now * 5.1 + l.seed) * 0.06 + Math.sin(now * 11.7 + l.seed * 2) * 0.04;
    l.light.intensity = l.base * f * ease(doorT);
    l.paper.material.emissiveIntensity = 1.7 * f;
    l.g.rotation.z = Math.sin(now * 0.6 + i) * 0.015;
  });

  // 襖の下の明かり（誰かが通ると陰る）
  let leak = 1;
  if (shadowPass > 0) {
    const t = now - shadowPass - 0.7;
    if (t > 0 && t < 4.5) {
      const x = 2.6 - t * 1.56; // 足音と同じ速さで右から左へ
      leak = 1 - 0.85 * Math.exp(-Math.pow(x / 0.9, 2));
      leakGlow.position.x = 0;
    }
  }
  leak *= 1 - doorT;
  leakLight.intensity = 0.35 * leak * fl;
  leakGlow.material.opacity = 0.22 * leak;
  leakStrip.material.color.setRGB(1 * leak, 0.62 * leak, 0.3 * leak);

  // 襖と押入れのアニメーション
  if (state.doorOpen && state.doorAnim < 1) state.doorAnim = Math.min(1, state.doorAnim + dt / 1.1);
  doorR.group.position.x = lerp(0.45, -0.35, ease(state.doorAnim));
  if (state.oshiireOpen && state.oshiireAnim < 1) state.oshiireAnim = Math.min(1, state.oshiireAnim + dt / 0.8);
  oshS.group.position.z = lerp(0.45, -0.35, ease(state.oshiireAnim));

  // 時計
  const gt = gameTime(now);
  const stamp = gt.m * 60 + gt.s;
  if (stamp !== lastDrawn) {
    lastDrawn = stamp;
    face.draw(gt.h, gt.m, gt.s);
  }
  if (state.gameStart && !gt.stopped) {
    const half = Math.floor((now - state.gameStart) * 2);
    if (half !== lastTick) {
      lastTick = half;
      audio.tick(clockPos, half % 2);
    }
  }

  if (state.phase === 'wake') wake(now);
  if (state.phase === 'play') {
    if (!state.paused && !talking()) {
      const { moved, inCorridor } = movePlayer(dt);
      const bob = moved > 0 ? Math.sin(now * 9) * 0.018 : 0;
      camera.position.set(pos.x, EYE + bob, pos.z);
      if (inCorridor) {
        if (!shownCorridor && pos.z > 2.3) {
          shownCorridor = true;
          say(MSG.corridor, () => setTimeout(endScene, 2600));
        }
        corridorTime += dt;
      }
    } else camera.position.set(pos.x, EYE, pos.z);
    camera.rotation.set(pitch, yaw, 0);
  }
  updateFocus();
  audio.updateListener(camera);
  composer.render();
}

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w / 2, h / 2);
});

// 起動時のカメラ（タイトルの背景として、眠っている視点の部屋を見せる）
camera.position.set(0.25, 0.22, -0.92);
camera.rotation.set(1.35, Math.PI, 0);
filmPass.uniforms.fade.value = 0.55;
frame();
$('start').disabled = false;
$('start').textContent = 'はじめる';

// 外から状態を確認するためのフック（動作確認用）
window.__inn = { state, pos, act, talking, setView: (p, y, pi) => { pos.copy(p); yaw = y; pitch = pi; }, focus: () => focus };
