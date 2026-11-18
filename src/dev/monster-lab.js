// 化け物の確認画面（開発用）：npm run dev → http://localhost:5173/monster-lab.html
// 旅館の廊下ほどの空間の天井に化け物を置き、行灯の明かりの下で動きを切り替えて見る。
//   ?id=MON_001（既定）  ボタンか 1〜9 キーで動き、M で這って近づく／止まる、R で位置を戻す、ドラッグで見回す
import * as THREE from 'three';
import { createMonster } from '../world/monster.js';

const Q = new URLSearchParams(location.search);
const ID = Q.get('id') || 'MON_001';
const CEILING = 2.4; // 旅館の天井の高さ（m）
const WIDTH = 1.8;

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050302);
scene.fog = new THREE.FogExp2(0x050302, 0.16);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);

// 廊下：床・天井・左右の壁（板張り風の色だけ）
const wood = new THREE.MeshStandardMaterial({ color: 0x3a2516, roughness: 0.85 });
const ceil = new THREE.MeshStandardMaterial({ color: 0x2c1d12, roughness: 0.9 });
const wall = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.95 });
const add = (geo, mat, f) => { const m = new THREE.Mesh(geo, mat); f(m); m.receiveShadow = true; scene.add(m); return m; };
add(new THREE.PlaneGeometry(WIDTH, 30), wood, (m) => (m.rotation.x = -Math.PI / 2));
add(new THREE.PlaneGeometry(WIDTH, 30), ceil, (m) => { m.rotation.x = Math.PI / 2; m.position.y = CEILING; });
for (const s of [-1, 1]) add(new THREE.PlaneGeometry(30, CEILING), wall, (m) => { m.rotation.y = -s * Math.PI / 2; m.position.set(s * WIDTH / 2, CEILING / 2, 0); });

// 明かり：手元の行灯（低い暖色）＋ごく弱い環境光
scene.add(new THREE.HemisphereLight(0x302820, 0x080604, 0.35));
const andon = new THREE.PointLight(0xffa860, 7, 9, 1.6);
andon.position.set(0.45, 0.55, 2.6);
andon.castShadow = true;
andon.shadow.mapSize.set(1024, 1024);
scene.add(andon);
const flame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.22), new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffa050, emissiveIntensity: 1.2 }));
flame.position.set(0.45, 0.3, 2.6);
scene.add(flame);

// 視点：廊下に立って、少し先の天井を見上げる
const eye = new THREE.Vector3(0, 1.5, 3.4);
let yaw = 0, pitch = 0.42;
let drag = null;
canvas.addEventListener('pointerdown', (e) => (drag = { x: e.clientX, y: e.clientY, yaw, pitch }));
addEventListener('pointerup', () => (drag = null));
addEventListener('pointermove', (e) => {
  if (!drag) return;
  yaw = drag.yaw - (e.clientX - drag.x) * 0.004;
  pitch = Math.max(-1.2, Math.min(1.3, drag.pitch - (e.clientY - drag.y) * 0.004));
});

const ui = document.getElementById('ui');
const info = document.getElementById('info');
const START_Z = -1.0;
let monster = null;
let moving = false;
let ready = false;
let error = null;

function setButtons() {
  for (const b of ui.querySelectorAll('button[data-anim]')) b.classList.toggle('on', b.dataset.anim === monster?.playing());
  ui.querySelector('#move')?.classList.toggle('on', moving);
}

function play(name) {
  monster.play(name, { loop: name !== 'turn_head' });
  if (name !== 'crawl') moving = false;
  setButtons();
}

createMonster(`models/${ID}.glb`).then((m) => {
  monster = m;
  m.root.position.set(0, CEILING, START_Z);
  scene.add(m.root);
  m.animations.forEach((name, i) => {
    const b = document.createElement('button');
    b.textContent = `${i + 1} ${name}`;
    b.dataset.anim = name;
    b.onclick = () => play(name);
    ui.append(b);
  });
  const mv = document.createElement('button');
  mv.id = 'move';
  mv.textContent = 'M 這って近づく';
  mv.onclick = () => toggleMove();
  ui.append(mv);
  const rs = document.createElement('button');
  rs.textContent = 'R 位置を戻す';
  rs.onclick = () => (m.root.position.z = START_Z);
  ui.append(rs);
  play(m.animations.includes('idle') ? 'idle' : m.animations[0]);
  ready = true;
}).catch((e) => {
  error = String(e);
  info.textContent = `読み込めません: models/${ID}.glb\n${e}`;
});

function toggleMove() {
  moving = !moving;
  if (moving) play('crawl');
  else play('idle');
}

addEventListener('keydown', (e) => {
  if (!monster) return;
  const n = Number(e.key);
  if (n >= 1 && n <= monster.animations.length) play(monster.animations[n - 1]);
  if (e.code === 'KeyM') toggleMove();
  if (e.code === 'KeyR') monster.root.position.z = START_Z;
});

const CRAWL_SPEED = 0.45; // m/秒（crawl の手足の速さに合わせる）
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  andon.intensity = 7 * (0.92 + Math.sin(t * 5.1) * 0.05 + Math.sin(t * 11.7) * 0.03);
  if (monster) {
    if (moving) monster.root.position.z = Math.min(eye.z - 0.6, monster.root.position.z + CRAWL_SPEED * dt);
    monster.update(dt);
    info.textContent = `${ID}  動き: ${monster.playing()}  位置 z=${monster.root.position.z.toFixed(2)}`;
  }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  camera.position.copy(eye);
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  renderer.render(scene, camera);
}
frame();

// ハーネス用（node harness/run.mjs ushimitsu-no-ryokan <手順> から h.open('monster-lab.html') で開く）
window.__game = {
  ready: () => ready || !!error,
  error: () => error,
  animations: () => monster?.animations || [],
  play,
  move: (on) => { if (on !== moving) toggleMove(); },
  look: (y, p) => { yaw = y; pitch = p; },
  monsterZ: () => monster?.root.position.z,
  bones: () => { let n = 0; monster?.root.traverse((o) => { if (o.isBone) n++; }); return n; },
  renderer,
  render: () => renderer.render(scene, camera),
};
