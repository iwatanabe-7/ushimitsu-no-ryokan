// 丑三つの宿 — 宿の中（設計書の Inn シーン）。GameManager に相当する進行管理もここに置く
import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { InnAudio } from './core/audio.js';
import { setRoot, initMaterials } from './world/kit.js';
import { EYE, R, CORRIDOR } from './world/layout.js';
import { buildTsubaki } from './world/tsubaki.js';
import { buildCorridor } from './world/corridor.js';
import { buildChoba } from './world/choba.js';
import { buildShobu } from './world/shobu.js';
import { buildKikyo } from './world/kikyo.js';
import { buildGenkan } from './world/genkan.js';
import { buildOkami } from './world/okami.js';
import { MSG, LABEL, ledgerEntries } from './game/messages.js';
import { UI, drawCardIcon, drawKeyIcon, drawLetterIcon } from './game/ui.js';
import { Player } from './game/player.js';
import { loadSave, writeSave } from './game/save.js';

const $ = (id) => document.getElementById(id);
const save = loadSave();
const lap2 = save.clearCount >= 1;

// ---------------------------------------------------------------- 描画と音
const canvas = $('view');
const G = createRenderer(canvas, save.settings.quality);
const { scene, camera } = G;
setRoot(scene);
initMaterials();
const audio = new InnAudio();
audio.volume = save.settings.volume;

// ---------------------------------------------------------------- 状態（GameManager）
const state = {
  phase: 'title', // title → intro → wake → play ⇄ scene → end
  lap2,
  hasKey: false, hasTsubaki: false, hasShobu: false, hasKikyo: false, hasLetter: false,
  oshiireOpen: false, oshiireAnim: 0,
  doorOpen: false, doorAnim: 0,
  shobuOpen: false, shobuAnim: 0,
  kikyoOpen: false, kikyoAnim: 0, // kikyoOpened（設計書のフラグ）
  ledgerSeen: false,
  lanternsOut: false,
  gameStart: 0,
  paused: false,
  visited: {},
};

// ---------------------------------------------------------------- 世界を組み立てる
const ctx = {
  scene, state,
  hits: [], walk: [], block: [], zones: [], floors: [], lamps: [], sway: [], clockFaces: [], tickSources: [],
  addLamp(o) {
    const light = new THREE.PointLight(o.color, 0, o.distance ?? 6, 2);
    light.position.copy(o.pos);
    scene.add(light);
    const lamp = { ...o, light, level: 1, vis: 0, seed: Math.random() * 100 };
    ctx.lamps.push(lamp);
    return lamp;
  },
};
scene.add(new THREE.HemisphereLight(0x2c3a58, 0x1a120a, 0.5));
// いちばん近い灯りだけが影を落とす（影の計算を1灯分に抑える）
const shadowLight = new THREE.PointLight(0xff9447, 0, 8, 2);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.set(G.shadowSize, G.shadowSize);
shadowLight.shadow.bias = -0.003;
shadowLight.shadow.normalBias = 0.02;
shadowLight.shadow.camera.near = 0.08;
scene.add(shadowLight);

const W = {
  tsubaki: buildTsubaki(ctx),
  corridor: buildCorridor(ctx),
  choba: buildChoba(ctx),
  shobu: buildShobu(ctx),
  kikyo: buildKikyo(ctx),
  genkan: buildGenkan(ctx),
};
const okami = buildOkami();
okami.visible = true;
okami.position.set(0, -50, 0); // 灯りの数を変えないよう、使わないときは床下に置く
const okamiFace = okami.userData.faceLight;
scene.add(okami);
function showOkami(on) {
  okamiFace.intensity = on ? 0.7 : 0;
  if (!on) okami.position.y = -50;
}
const okamiShadow = buildOkami({ shadowOnly: true });
scene.add(okamiShadow);
G.setQuality(save.settings.quality);

// 二周目の差分（SecondLapSwitch）
const okamiHit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
okamiHit.userData = { id: 'okami', enabled: false };
okamiHit.position.set(0.2, 0.8, 3.15);
scene.add(okamiHit);
ctx.hits.push(okamiHit);
// 女将の影は最初はいない。二周目で娘の手紙を手に入れたあと、帳場の前に現れる
okamiShadow.position.set(0.2, 0, 3.15);
okamiShadow.rotation.y = 0;
const OKAMI_SPOT = new THREE.Vector3(0.2, 1.0, 3.15);
let okamiArrived = false;
ctx.block.push({ c: [0.2, 3.15, 0.25 + R], when: () => okamiArrived });
if (lap2) {
  W.kikyo.letter.visible = true;
  W.choba.setFigure(false);
}

// ---------------------------------------------------------------- UI と入力
const ui = new UI();
const player = new Player(ctx, canvas);
player.sensitivity = save.settings.sensitivity;
let suppressPause = false;
player.onLockChange = (locked) => {
  if (locked) return;
  if (suppressPause) {
    suppressPause = false;
    return;
  }
  if (state.phase === 'play' && !ui.talking && !ui.modal && !player.isTouch) openPause();
};
function releasePointer() {
  if (document.pointerLockElement) {
    suppressPause = true;
    document.exitPointerLock();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) {
    if (e.code === 'Enter') writeName();
    if (e.code === 'Escape') cancelName();
    return;
  }
  if (e.code === 'F11') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }
  if (ui.modal === 'lock') {
    e.preventDefault();
    ui.lockKey(e.code);
    return;
  }
  if (ui.modal === 'ledger') {
    if (e.code === 'Escape') closeLedger();
    return;
  }
  if (['KeyE', 'Space', 'Enter'].includes(e.code)) {
    e.preventDefault();
    act();
  }
  if (e.code === 'Escape' && ui.talking) ui.next();
});
$('act').addEventListener('click', act);
$('intro').addEventListener('click', act);
if (player.isTouch) $('touch').hidden = false;

// ---------------------------------------------------------------- 時計（InnClock）
function gameTime(now) {
  if (!state.gameStart) return { h: 2, m: 0, s: 0, stopped: false };
  const sec = Math.min((now - state.gameStart) * 2, 30 * 60);
  return { h: 2, m: Math.floor(sec / 60), s: Math.floor(sec % 60), stopped: sec >= 30 * 60 };
}
const timeText = (t) => `${t.h}時${String(t.m).padStart(2, '0')}分`;

// ---------------------------------------------------------------- 調べる（Interactable）
const ray = new THREE.Raycaster();
ray.far = 2.3;
let focus = null;
function updateFocus() {
  focus = null;
  if (state.phase !== 'play' || ui.talking || ui.modal || state.paused) return ui.setPrompt(null);
  ray.setFromCamera({ x: 0, y: 0 }, camera);
  const res = ray.intersectObjects(ctx.hits.filter((h) => h.userData.enabled), false);
  if (res.length) focus = res[0].object.userData.id;
  ui.setPrompt(focus ? LABEL[focus] : null);
}

const say = (lines, done) => ui.say(lines, done);
const now = () => performance.now() / 1000;

function give(id, name, draw, flag) {
  state[flag] = true;
  audio.pickup();
  ui.addItem(id, name, draw);
}

function act() {
  if (state.phase === 'title') return;
  if (state.phase === 'intro') return skipIntro();
  if (ui.talking) return ui.next();
  if (state.phase !== 'play' || !focus || ui.modal) return;
  const T = W.tsubaki, S = W.shobu, K = W.kikyo, C = W.choba, Gk = W.genkan;
  switch (focus) {
    // 椿の間
    case 'clock': {
      const t = gameTime(now());
      return say(t.stopped ? MSG.clockStopped : MSG.clock(timeText(t)));
    }
    case 'door':
      if (!state.hasKey) return say(MSG.doorLocked);
      audio.unlock(T.doorPos);
      return say(MSG.doorUnlock, () => {
        state.doorOpen = true;
        T.H.door.userData.enabled = false;
        audio.slide(T.doorPos, 1.1, 0.4);
      });
    case 'oshiire':
      state.oshiireOpen = true;
      T.H.oshiire.userData.enabled = false;
      audio.slide(new THREE.Vector3(1.8, 0.9, 0.3), 0.8, 0.3);
      setTimeout(() => {
        T.H.oshiireInner.userData.enabled = true;
        T.H.yukata.userData.enabled = true;
      }, 700);
      return;
    case 'yukata':
      if (state.hasKey) return say(MSG.yukataEmpty);
      audio.pickup();
      state.hasKey = true;
      return say(MSG.yukata, () => {
        ui.addItem('key', '廊下の鍵', drawKeyIcon);
        setTimeout(passingShadow, 1600);
      });
    case 'card':
      T.card.visible = false;
      T.H.card.userData.enabled = false;
      audio.pickup();
      state.hasTsubaki = true;
      return say(MSG.card, () => ui.addItem('tsubaki', '椿の札', drawCardIcon('tsubaki')));

    // 帳場
    case 'ledger':
      return openLedger();
    case 'chobaShoji':
      if (lap2 || state.ledgerSeen) return say(MSG.chobaShojiEmpty);
      return say(MSG.chobaShoji);
    case 'pillarClock': {
      const t = gameTime(now());
      return say(t.stopped ? MSG.pillarClockStopped : MSG.pillarClock(timeText(t)));
    }

    // 菖蒲の間
    case 'shobuDoor':
      state.shobuOpen = true;
      S.H.shobuDoor.userData.enabled = false;
      audio.slide(S.doorPos, 1.0, 0.35);
      return say(MSG.shobuDoor);
    case 'diary':
      return say(lap2 ? [...MSG.diary, ...MSG.diaryLap2] : MSG.diary);
    case 'mirror':
      if (state.hasShobu) return say(MSG.mirrorEmpty);
      return say(MSG.mirror, mirrorScare);

    // 桔梗の間
    case 'kikyoDoor': {
      const n = (state.hasTsubaki ? 1 : 0) + (state.hasShobu ? 1 : 0);
      if (n < 2) return say(n ? MSG.kikyoOne : MSG.kikyoLocked);
      return say(MSG.kikyoOpen, () => {
        K.slotCards.forEach((c) => (c.visible = true));
        audio.unlock(K.doorPos);
        state.kikyoOpen = true;
        K.H.kikyoDoor.userData.enabled = false;
        setTimeout(() => audio.slide(K.doorPos, 1.2, 0.35), 500);
      });
    }
    case 'kikyoDesk':
      if (!state.hasKikyo) {
        K.card.visible = false;
        audio.pickup();
        state.hasKikyo = true;
        return say(MSG.kikyoDesk, () => {
          ui.addItem('kikyo', '桔梗の札', drawCardIcon('kikyo'));
          lanternScare();
        });
      }
      if (lap2 && !state.hasLetter) {
        K.letter.visible = false;
        return say(MSG.letter, () => give('letter', '娘の手紙', drawLetterIcon, 'hasLetter'));
      }
      return say(MSG.kikyoDeskEmpty);

    // 玄関
    case 'lock':
      if (!(state.hasTsubaki && state.hasShobu && state.hasKikyo)) return say(MSG.lockNeed);
      return openLock();

    // 二周目：女将の影
    case 'okami':
      if (!state.hasLetter) return say(MSG.okamiShadow);
      return say(MSG.okamiGive, endingC);

    default:
      return say(MSG[focus] || ['……']);
  }
}

// ---------------------------------------------------------------- 宿帳（LedgerUI）
function openLedger() {
  releasePointer();
  player.lookEnabled = false;
  ui.showLedger(ledgerEntries({ lap2 }), {
    canSign: true,
    onClose: closeLedger,
  });
}
function closeLedger() {
  ui.hideLedger();
  player.lookEnabled = true;
  player.requestLock();
  if (!state.ledgerSeen) {
    state.ledgerSeen = true;
    // 宿帳を読んでいるあいだに、障子の影が消えている
    if (!lap2) W.choba.setFigure(false);
  }
}
$('ledgerClose').addEventListener('click', closeLedger);
$('ledgerSign').addEventListener('click', () => ui.ledgerAskName());
$('ledgerWrite').addEventListener('click', writeName);
$('ledgerCancel').addEventListener('click', cancelName);
function cancelName() {
  ui.showLedger(ledgerEntries({ lap2 }), { canSign: true, onClose: closeLedger });
}
function writeName() {
  const name = ui.el.ledgerName.value.trim() || '名無し';
  ui.hideLedger();
  endingB(name.slice(0, 8));
}

// ---------------------------------------------------------------- 花札錠（HanafudaLock）
const ANSWER = ['kikyo', 'shobu', 'tsubaki'];
function openLock() {
  releasePointer();
  player.lookEnabled = false;
  ui.showLock(['tsubaki', 'shobu', 'kikyo'], {
    onTry(slots) {
      if (slots.every((s, i) => s === ANSWER[i])) {
        ui.hideLock();
        W.genkan.slots.forEach((m, i) => {
          m.material[2].map = cardTexture(slots[i]);
          m.material[2].needsUpdate = true;
          m.visible = true;
        });
        genkanScare();
        return true;
      }
      // 間違えると札が戻り、柱時計が一度鳴る
      audio.bong(W.choba.pillarClockPos, 0.55);
      ui.subtitle(MSG.lockWrong[0]);
      return false;
    },
    onClose() {
      player.lookEnabled = true;
      player.requestLock();
    },
  });
}
$('lockTry').addEventListener('click', () => ui.lockTry());
$('lockBack').addEventListener('click', () => ui.lockClose());
function cardTexture(kind) {
  const src = { tsubaki: W.tsubaki.card, shobu: W.shobu.shobuCard, kikyo: W.kikyo.card }[kind];
  return src.material[2].map;
}

// ---------------------------------------------------------------- 驚かせどころ（ScareTrigger）と異変
let shadowPass = -1;
function passingShadow() {
  shadowPass = now();
  audio.creak(new THREE.Vector3(2.5, 0.2, 2.6), 0.3, 0.9);
  for (let i = 0; i < 6; i++) setTimeout(() => audio.stepWood(new THREE.Vector3(2.6 - i, 0, 2.7), 0.45), 700 + i * 640);
}

let flashUntil = 0;
// 驚かせ1：鏡台を調べると、鏡に女将が0.5秒映る
function mirrorScare() {
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const side = new THREE.Vector3(-f.z, 0, f.x);
  okami.position.copy(player.pos).addScaledVector(f, -1.05).addScaledVector(side, 0.12);
  okami.position.y = 0;
  okami.rotation.y = player.yaw + Math.PI;
  showOkami(true);
  audio.breath(okami.position.clone().setY(1.4), 0.25);
  audio.drone(3, 0.1);
  flashUntil = now() + 0.5;
  setTimeout(() => {
    showOkami(false);
    setTimeout(() => {
      state.hasShobu = true;
      audio.pickup();
      say(MSG.mirrorAfter, () => ui.addItem('shobu', '菖蒲の札', drawCardIcon('shobu')));
    }, 500);
  }, 500);
}

// 驚かせ2：桔梗の札を取ると、廊下の提灯が半分消えて、襖の外を足音が通り過ぎる
function lanternScare() {
  state.phase = 'scene';
  const lan = W.corridor.lanterns;
  [3, 1].forEach((idx, k) => {
    setTimeout(() => {
      lan[idx].lamp.level = 0;
      lan[idx].paper.material.emissiveIntensity = 0;
      audio.snuff(lan[idx].lamp.pos);
    }, 400 + k * 700);
  });
  for (let i = 0; i < 7; i++) setTimeout(() => audio.stepWood(new THREE.Vector3(6.4 + i * 0.75, 0, 2.6), 0.5), 1700 + i * 600);
  setTimeout(() => {
    state.phase = 'play';
    state.lanternsOut = true;
    say(MSG.kikyoScare);
  }, 1700 + 7 * 600);
}

// 驚かせ3：花札錠が開く直前、背後に女将が立つ
let turnAnim = null;
function genkanScare() {
  state.phase = 'scene';
  audio.unlock(W.genkan.lockPos);
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  setTimeout(() => {
    const p = player.pos.clone().addScaledVector(f, -1.05);
    okami.position.set(p.x, player.floorAt(p.x, p.z), p.z);
    okami.rotation.y = player.yaw; // プレイヤーの背中を向いて立つ
    showOkami(true);
    audio.voice(MSG.okamiVoice);
    ui.subtitle(`「${MSG.okamiVoice}」`, 2400);
    audio.breath(okami.position.clone().setY(1.4), 0.2);
  }, 900);
  setTimeout(() => {
    turnAnim = { t0: now(), from: player.yaw, to: player.yaw + Math.PI, fromPitch: player.pitch, dur: 1.5 };
  }, 2000);
  setTimeout(() => {
    G.film.uniforms.fade.value = 1;
    showOkami(false);
    audio.drone(4, 0.12);
    setTimeout(endingA, 1800);
  }, 4300);
}

// ---------------------------------------------------------------- エンディング
function finish(key, title, lines, note) {
  state.phase = 'end';
  releasePointer();
  $('reticle').hidden = true;
  save.seen[key] = true;
  if (key === 'A') save.clearCount += 1;
  writeSave(save);
  $('endTitle').textContent = title;
  const box = $('endLines');
  box.textContent = '';
  lines.forEach((l, i) => {
    const p = document.createElement('p');
    p.textContent = l;
    p.style.animationDelay = `${0.6 + i * 1.6}s`;
    box.append(p);
  });
  $('endNote').textContent = note || '';
  $('endNote').style.animationDelay = `${0.6 + lines.length * 1.6}s`;
  renderSeen($('endSeen'));
  $('end').hidden = false;
}
function fadeOut(sec, then) {
  const t0 = now();
  const step = () => {
    const t = (now() - t0) / sec;
    G.film.uniforms.fade.value = Math.min(1, Math.max(G.film.uniforms.fade.value, t));
    if (t < 1) requestAnimationFrame(step);
    else then?.();
  };
  step();
}
function endingA() {
  finish('A', '終　脱出', MSG.endA, save.seen.C ? '' : '二周目では、宿の様子が少し変わります。');
}
function endingB(name) {
  state.phase = 'scene';
  player.lookEnabled = false;
  fadeOut(1.6, () => {
    ui.subtitle(MSG.endB[0], 2200);
    setTimeout(() => {
      audio.voice('ようこそ、おいでくださいました');
      ui.subtitle(MSG.endB[1], 3000);
    }, 2300);
    setTimeout(() => {
      const rows = ledgerEntries({ lap2 });
      rows[rows.length - 1] = { ...rows[rows.length - 1], name, blank: false, fresh: true };
      rows.push({ date: '今宵', room: '椿の間', mark: null, name: '', blank: true });
      ui.showLedger(rows, { caption: MSG.endBLedger });
      setTimeout(() => {
        ui.hideLedger();
        finish('B', '終　宿に残る', [`宿帳には、「${name}」の名前が残った。`]);
      }, 5200);
    }, 5600);
  });
}
function endingC() {
  state.phase = 'scene';
  fadeOut(3, () => finish('C', '終　真相', MSG.endC, '丑三つの宿をすべて見届けました。'));
}

function renderSeen(el) {
  el.textContent = '';
  for (const k of ['A', 'B', 'C']) {
    const s = document.createElement('span');
    s.className = save.seen[k] ? 'seen' : '';
    s.textContent = save.seen[k] ? k : '・';
    s.title = save.seen[k] ? `エンディング${k}を見た` : 'まだ見ていないエンディング';
    el.append(s);
  }
}

// ---------------------------------------------------------------- 一時停止と設定
function openPause() {
  state.paused = true;
  $('pause').hidden = false;
}
function closePause() {
  state.paused = false;
  $('pause').hidden = true;
  player.requestLock();
}
$('resume').addEventListener('click', closePause);
$('toTitle').addEventListener('click', () => location.reload());
$('endToTitle').addEventListener('click', () => location.reload());
const vol = $('setVolume'), sens = $('setSens'), qual = $('setQuality');
vol.value = save.settings.volume;
sens.value = save.settings.sensitivity;
qual.value = save.settings.quality;
vol.addEventListener('input', () => {
  save.settings.volume = +vol.value;
  audio.setVolume(+vol.value);
  writeSave(save);
});
sens.addEventListener('input', () => {
  save.settings.sensitivity = +sens.value;
  player.sensitivity = +sens.value;
  writeSave(save);
});
qual.addEventListener('change', () => {
  save.settings.quality = qual.value;
  G.setQuality(qual.value);
  shadowLight.shadow.mapSize.set(G.shadowSize, G.shadowSize);
  shadowLight.shadow.map?.dispose();
  shadowLight.shadow.map = null;
  writeSave(save);
});
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  } catch (_) { /* 全画面にできない環境 */ }
}
$('setFull').addEventListener('click', toggleFullscreen);

// ---------------------------------------------------------------- 進行：タイトル → 導入 → 目覚め
renderSeen($('titleSeen'));
if (lap2) $('lapLabel').hidden = false;
function startGame() {
  audio.start();
  audio.setVolume(save.settings.volume);
  $('title').classList.add('out');
  setTimeout(() => ($('title').hidden = true), 1200);
  state.phase = 'intro';
  playIntro();
}
const introLines = lap2 ? MSG.introLap2 : MSG.intro;
let introTimer = null;
let introIdx = 0;
function playIntro() {
  $('intro').hidden = false;
  showIntroLine();
}
function showIntroLine() {
  clearTimeout(introTimer);
  if (introIdx >= introLines.length) return finishIntro();
  const el = $('introLine');
  el.classList.remove('in');
  setTimeout(() => {
    el.textContent = introLines[introIdx++];
    el.classList.add('in');
    introTimer = setTimeout(showIntroLine, 3600);
  }, 450);
}
function skipIntro() {
  showIntroLine();
}
let wakeStart = 0;
function finishIntro() {
  if (state.phase !== 'intro') return;
  clearTimeout(introTimer);
  $('intro').classList.add('out');
  setTimeout(() => ($('intro').hidden = true), 1500);
  state.phase = 'wake';
  wakeStart = now();
  audio.drone(6, 0.06);
}
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
function wake(t0) {
  const t = Math.min(1, (t0 - wakeStart) / 4.2);
  G.film.uniforms.fade.value = Math.max(0, 1 - t * 2.2);
  const a = ease(Math.min(1, t * 1.8));
  const b = ease(Math.max(0, (t - 0.5) / 0.5));
  camera.position.set(lerp(0.25, 0.3, b), lerp(0.22, lerp(0.85, EYE, b), a), lerp(-0.92, -0.45, a));
  camera.rotation.set(lerp(1.35, lerp(0.05, 0, b), a), lerp(Math.PI, Math.PI + 0.35, b), 0);
  if (t >= 1) {
    state.phase = 'play';
    state.gameStart = t0;
    player.lookEnabled = true;
    $('reticle').hidden = false;
    say(MSG.wake);
    player.requestLock();
  }
}
$('start').addEventListener('click', startGame);

// ---------------------------------------------------------------- 毎フレームの処理
function zoneAt(x, z) {
  for (const zn of ctx.zones) {
    const [x0, x1, z0, z1] = zn.r;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return zn.name;
  }
  return 'corridor';
}
// プレイヤーから見える区画（閉じた部屋の灯りは消しておき、壁越しの光漏れを防ぐ）
function visibleZones(zone) {
  const open = { tsubaki: state.doorAnim > 0.01, shobu: state.shobuAnim > 0.01, kikyo: state.kikyoAnim > 0.01, choba: true, genkan: true };
  const v = new Set([zone]);
  if (zone === 'corridor') {
    for (const k in open) if (open[k]) v.add(k);
  } else if (open[zone]) {
    v.add('corridor');
  }
  return v;
}

let shadowLamp = null;
let lastTick = -1;
let lastDrawn = -1;
let lastZone = 'tsubaki';
let needCardShown = 0;
let nextCreak = 40;
let prev = now();
const frustum = new THREE.Frustum();
const projScreen = new THREE.Matrix4();

function frame() {
  requestAnimationFrame(frame);
  const t = now();
  const dt = Math.min(0.05, t - prev);
  prev = t;
  G.film.uniforms.time.value = t;
  G.film.uniforms.flash.value = t < flashUntil ? 1 : Math.max(0, G.film.uniforms.flash.value - dt * 3);

  const zone = state.phase === 'title' || state.phase === 'intro' || state.phase === 'wake' ? 'tsubaki' : zoneAt(player.pos.x, player.pos.z);
  const vis = visibleZones(zone);

  // 灯り
  let best = null;
  let bestD = Infinity;
  for (const L of ctx.lamps) {
    L.vis += ((vis.has(L.zone) ? 1 : 0) - L.vis) * Math.min(1, dt * 4);
    const fl = L.kind === 'lantern'
      ? 0.9 + Math.sin(t * 5.1 + L.seed) * 0.06 + Math.sin(t * 11.7 + L.seed * 2) * 0.04
      : 0.86 + Math.sin(t * 7.3 + L.seed) * 0.05 + Math.sin(t * 13.1 + L.seed) * 0.04 + (Math.random() - 0.5) * 0.06;
    L.now = L.base * fl * L.level * L.vis;
    L.light.intensity = L.now;
    if (L.paper) L.paper.emissiveIntensity = L.paperBase * fl * L.level;
    if (L.flame) L.flame.scale.set(1, 2 + Math.sin(t * 17 + L.seed) * 0.4, 1);
    if (L.vis > 0.5 && L.level > 0.1) {
      const d = L.pos.distanceTo(player.pos) - (L === shadowLamp ? 0.6 : 0);
      if (d < bestD) {
        bestD = d;
        best = L;
      }
    }
  }
  shadowLamp = best;
  if (best) {
    best.light.intensity = 0;
    shadowLight.position.copy(best.pos);
    shadowLight.color.setHex(best.color);
    shadowLight.intensity = best.now;
    shadowLight.distance = best.distance ?? 6;
  } else shadowLight.intensity = 0;

  // 襖の下の明かり（誰かが通ると陰る）
  {
    const T = W.tsubaki;
    let leak = 1;
    if (shadowPass > 0) {
      const s = t - shadowPass - 0.7;
      if (s > 0 && s < 4.5) leak = 1 - 0.85 * Math.exp(-Math.pow((2.6 - s * 1.56) / 0.9, 2));
    }
    leak *= 1 - state.doorAnim;
    T.leakLight.intensity = 0.35 * leak;
    T.leakGlow.material.opacity = 0.22 * leak;
    T.leakStrip.material.color.setRGB(leak, 0.62 * leak, 0.3 * leak);
    T.leakStrip.visible = T.leakGlow.visible = zone === 'tsubaki';
  }

  // 建具のアニメーション
  const anim = (open, key, sec) => {
    if (state[open] && state[key] < 1) state[key] = Math.min(1, state[key] + dt / sec);
    return ease(state[key]);
  };
  W.tsubaki.door.open(anim('doorOpen', 'doorAnim', 1.1));
  W.tsubaki.oshS.position.z = lerp(0.45, -0.35, anim('oshiireOpen', 'oshiireAnim', 0.8));
  W.shobu.door.open(anim('shobuOpen', 'shobuAnim', 1.0));
  W.kikyo.door.open(anim('kikyoOpen', 'kikyoAnim', 1.2));

  // 時計
  const gt = gameTime(t);
  const stamp = gt.m * 60 + gt.s;
  if (stamp !== lastDrawn) {
    lastDrawn = stamp;
    ctx.clockFaces.forEach((f) => f.draw(gt.h, gt.m, gt.s));
  }
  if (state.gameStart && !gt.stopped) {
    const half = Math.floor((t - state.gameStart) * 2);
    if (half !== lastTick) {
      lastTick = half;
      for (const src of ctx.tickSources) {
        if (src.kind === 'small') audio.tick(src.pos, half % 2);
        else if (half % 2 === 0) audio.burst(src.pos, { type: 'bandpass', freq: 1400, q: 3, dur: 0.06, gain: 0.35 });
      }
    }
  }
  for (const src of ctx.tickSources) if (src.pendulum) src.pendulum.rotation.z = gt.stopped ? 0 : Math.sin((t - state.gameStart) * Math.PI) * 0.16;

  // 揺れる物
  for (const s of ctx.sway) {
    if (s.lantern) s.mesh.rotation.z = Math.sin(t * 0.6 + s.seed) * 0.015;
    else s.mesh.rotation.x = Math.sin(t * 0.8 + s.seed) * 0.05;
  }

  okami.userData.update(t);
  okamiShadow.userData.update(t);

  // 鏡は菖蒲の間にいるときだけ描く
  W.shobu.mirror.visible = zone === 'shobu';

  projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreen);

  // 二周目：手紙を持ったら、見ていないうちに女将の影が帳場の前に立つ
  if (lap2 && state.hasLetter && !okamiArrived && !ui.talking) {
    const near = player.pos.distanceTo(OKAMI_SPOT) < 0.9;
    if (!near && !frustum.containsPoint(OKAMI_SPOT)) {
      okamiArrived = true;
      okamiShadow.visible = true;
      okamiHit.userData.enabled = true;
      audio.creak(OKAMI_SPOT, 0.25, 1.0);
    }
  }

  // 人形は、見ていないうちにこちらを向く
  const doll = W.kikyo.doll;
  if (!frustum.containsPoint(doll.position.clone().setY(0.25))) {
    doll.rotation.y = Math.atan2(player.pos.x - doll.position.x, player.pos.z - doll.position.z);
  }

  if (state.phase === 'wake') wake(t);
  if (state.phase === 'play' || state.phase === 'scene') {
    if (state.phase === 'play' && !state.paused && !ui.talking && !ui.modal) {
      const moved = player.update(dt, gate);
      footsteps(moved, zone, dt);
      zoneEvents(zone);
    }
    if (turnAnim) {
      const k = Math.min(1, (t - turnAnim.t0) / turnAnim.dur);
      player.yaw = lerp(turnAnim.from, turnAnim.to, ease(k));
      player.pitch = lerp(turnAnim.fromPitch, 0.08, ease(k));
    }
    const bob = 0;
    camera.position.set(player.pos.x, EYE + player.floorY + bob, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  // ときどき、どこかで襖がきしむ
  if (state.phase === 'play' && t - state.gameStart > nextCreak) {
    nextCreak = t - state.gameStart + (state.lanternsOut ? 25 : 45) + Math.random() * 30;
    const x = CORRIDOR.x0 + Math.random() * (CORRIDOR.x1 - CORRIDOR.x0);
    audio.creak(new THREE.Vector3(x, 1.0, 2.7), 0.18, 0.8);
  }

  updateFocus();
  audio.updateListener(camera);
  G.render();
}

// 床の間の札を取るまでは、椿の間から出られない
function gate(x, z) {
  if (!state.hasTsubaki && x < 2 && z > 1.8 - R) {
    const n = performance.now();
    if (state.doorAnim > 0.85 && n - needCardShown > 6000) {
      needCardShown = n;
      say(MSG.needCard);
    }
    return false;
  }
  return true;
}

let stillTime = 0;
let echoArmed = false;
let stepAcc = 0;
function footsteps(moved, zone, dt) {
  const p = player.pos;
  stepAcc += moved;
  if (stepAcc > 0.62) {
    stepAcc = 0;
    if (zone === 'tsubaki' || zone === 'shobu' || zone === 'kikyo') audio.stepTatami();
    else if (player.floorY < -0.2) audio.burst(null, { type: 'lowpass', freq: 900, q: 0.7, dur: 0.12, gain: 0.25 });
    else audio.stepWood(new THREE.Vector3(p.x, 0, p.z), 0.28);
  }
  // 足音の残響（FootstepEcho）：廊下で止まると、少し遅れてもう一歩
  if (moved > 0.0005) {
    stillTime = 0;
    if (zone === 'corridor') echoArmed = true;
  } else {
    stillTime += dt;
    if (echoArmed && stillTime > 0.38) {
      echoArmed = false;
      const back = new THREE.Vector3(Math.sin(player.yaw) * 1.6, 0, Math.cos(player.yaw) * 1.6).add(p);
      audio.stepWood(back, 0.4);
    }
  }
}

function zoneEvents(zone) {
  if (zone !== lastZone) {
    lastZone = zone;
    if (!state.visited[zone]) {
      state.visited[zone] = true;
      if (zone === 'corridor') say(MSG.corridorFirst);
      if (zone === 'genkan') say(MSG.genkanFirst);
    }
  }
}

// タイトル中のカメラ：眠っている視点
camera.position.set(0.25, 0.22, -0.92);
camera.rotation.set(1.35, Math.PI, 0);
G.film.uniforms.fade.value = 0.55;
frame();
$('start').disabled = false;
$('start').textContent = 'はじめる';

// 動作確認用のフック
window.__inn = {
  state, player, ui, act, W, save,
  focus: () => focus,
  debugOkamiAt(x, y, z, ry) {
    okami.position.set(x, y, z);
    okami.rotation.y = ry;
    showOkami(true);
  },
  debugOkamiBehind() {
    const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const side = new THREE.Vector3(-f.z, 0, f.x);
    okami.position.copy(player.pos).addScaledVector(f, -1.05).addScaledVector(side, 0.12);
    okami.position.y = 0;
    okami.rotation.y = player.yaw + Math.PI;
    showOkami(true);
  },
  look(x, z, tx, ty, tz) {
    player.pos.set(x, EYE, z);
    const dx = tx - x, dy = ty - EYE - player.floorY, dz = tz - z;
    player.yaw = Math.atan2(-dx, -dz);
    player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  },
};
