// 丑三つの旅館 — 宿の中（設計書の Inn シーン）。GameManager に相当する進行管理もここに置く
import * as THREE from 'three';
import { createRenderer, QUALITY } from './core/renderer.js';
import { mergeStatic } from './core/merge.js';
import { InnAudio } from './core/audio.js';
import { setRoot, initMaterials } from './world/kit.js';
import { EYE, R, CORRIDOR } from './world/layout.js';
import { buildTsubaki } from './world/tsubaki.js';
import { buildCorridor } from './world/corridor.js';
import { buildChoba } from './world/choba.js';
import { buildShobu } from './world/shobu.js';
import { buildKikyo } from './world/kikyo.js';
import { buildGenkan } from './world/genkan.js';
import { buildWatari } from './world/watari.js';
import { buildBath } from './world/bath.js';
import { buildHiroma } from './world/hiroma.js';
import { buildUpstairs } from './world/upstairs.js';
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
  hiromaOpen: false, hiromaAnim: 0,
  yudonoOpen: false, yudonoAnim: 0, hasYudonoKey: false, mirrorSeen: false,
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
  // 灯りは数が多いので、実際の光源は近いものから順に LIGHT_POOL 個だけ割り当てる
  addLamp(o) {
    const lamp = { ...o, level: 1, vis: 0, now: 0, seed: Math.random() * 100 };
    ctx.lamps.push(lamp);
    return lamp;
  },
};
const hemi = new THREE.HemisphereLight(0x2c3a58, 0x1a120a, 0.5);
scene.add(hemi);
// いちばん近い灯りだけが影を落とす（影の計算を1灯分に抑える）
const shadowLight = new THREE.PointLight(0xff9447, 0, 8, 2);
shadowLight.castShadow = true;
shadowLight.userData.minShadow = 1024; // 女将の影の輪郭が崩れないよう、画質を下げても最低限の解像度を保つ
shadowLight.shadow.mapSize.setScalar(Math.max(G.shadowSize, 1024));
shadowLight.shadow.bias = -0.003;
shadowLight.shadow.normalBias = 0.02;
shadowLight.shadow.camera.near = 0.08;
// 影は灯りが替わったときや物が動いたときだけ描き直す（毎フレーム6方向ぶん描くのが一番重い）
shadowLight.shadow.autoUpdate = false;
scene.add(shadowLight);
const LIGHT_POOL = 8;
const pool = [];
for (let i = 0; i < LIGHT_POOL; i++) {
  const l = new THREE.PointLight(0xffffff, 0, 6, 2);
  scene.add(l);
  pool.push(l);
}

const W = {
  tsubaki: buildTsubaki(ctx),
  corridor: buildCorridor(ctx),
  choba: buildChoba(ctx),
  shobu: buildShobu(ctx),
  kikyo: buildKikyo(ctx),
  genkan: buildGenkan(ctx),
  watari: buildWatari(ctx),
  bath: buildBath(ctx),
  hiroma: buildHiroma(ctx),
  upstairs: buildUpstairs(ctx),
};
// 女将は姿を見せない。灯りの前に立ったときの影だけで現れる
const okami = buildOkami({ mode: 'caster' });
okami.visible = true;
okami.position.set(0, -50, 0); // 使わないときは床下に置く
scene.add(okami);
function showOkami(on) {
  if (!on) okami.position.y = -50;
}
// 鏡の中にだけ映る黒い人影
const mirrorFigure = buildOkami({ mode: 'silhouette' });
scene.add(mirrorFigure);
let mirrorFigureOn = false;
{
  const mirror = W.shobu.mirror;
  const orig = mirror.onBeforeRender;
  mirror.onBeforeRender = function (...args) {
    mirrorFigure.visible = mirrorFigureOn;
    orig.apply(this, args);
    mirrorFigure.visible = false;
  };
}
// 二周目、帳場の前に「影だけ」が立つ
const okamiShadow = buildOkami({ mode: 'caster' });
okamiShadow.visible = false;
scene.add(okamiShadow);
// 影を落とさせたい灯り（驚かせの演出中だけ使う）
let forcedLamp = null;
G.setQuality(save.settings.quality);

// 二周目の差分（SecondLapSwitch）
const okamiHit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
okamiHit.userData = { id: 'okami', enabled: false };
okamiHit.position.set(5.2, 0.8, 3.28);
scene.add(okamiHit);
ctx.hits.push(okamiHit);
// 女将の影は最初はいない。二周目で娘の手紙を手に入れたあと、帳場の前に現れる
// 帳場と玄関のあいだ、提灯（玄関寄りの一つ）に照らされる壁際に立つ。壁に横顔の影が落ちる
okamiShadow.position.set(5.2, 0, 3.28);
okamiShadow.rotation.y = -Math.PI / 2;
const OKAMI_SPOT = new THREE.Vector3(5.2, 1.0, 3.28);
let okamiArrived = false;
ctx.block.push({ c: [5.2, 3.28, 0.22 + R], when: () => okamiArrived });
if (lap2) {
  W.kikyo.letter.visible = true;
  W.choba.setFigure(false);
}

// 動かない部品をまとめて描画を軽くする。動く物・消える物・揺れる物はそのまま残す
{
  const dyn = new Set([okami, okamiShadow, mirrorFigure, okamiHit]);
  const add = (...objs) => objs.forEach((o) => o && dyn.add(o));
  const T = W.tsubaki, S = W.shobu, K = W.kikyo, Gk = W.genkan, Wt = W.watari, B = W.bath;
  add(T.door.left, T.door.right, T.oshS, T.card, T.leakStrip, T.leakGlow);
  add(S.door.left, S.door.right, S.mirror, S.shobuCard);
  add(K.door.left, K.door.right, K.card, K.letter, K.doll, ...K.slotCards);
  add(...Gk.panels, ...Gk.slots);
  add(Wt.hiromaDoor.left, Wt.hiromaDoor.right, Wt.pond);
  add(B.door, B.card, ...B.leaves);
  add(W.hiroma.key);
  for (const s of ctx.sway) add(s.mesh);
  for (const L of ctx.lamps) add(L.flame);
  for (const src of ctx.tickSources) add(src.pendulum);
  const r = mergeStatic(scene, dyn);
  console.info(`静的な部品 ${r.before} 個を ${r.after} 個にまとめました`);
}

// ---------------------------------------------------------------- UI と入力
const ui = new UI();
const player = new Player(ctx, canvas);
player.sensitivity = save.settings.sensitivity;
player.lookBlocked = () => ui.talking; // 文字が出ているあいだは視点も止める
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
      if (state.mirrorSeen) return say(MSG.mirrorEmptyNote);
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

    // 渡り廊下・大広間・大浴場
    case 'hiromaDoor':
      state.hiromaOpen = true;
      W.watari.H.hiromaDoor.userData.enabled = false;
      audio.slide(new THREE.Vector3(14.6, 0.9, 3.5), 1.0, 0.35);
      return;
    case 'kamiza':
      if (state.hasYudonoKey) return say(MSG.kamizaEmpty);
      W.hiroma.key.visible = false;
      audio.pickup();
      state.hasYudonoKey = true;
      return say(MSG.kamiza, () => {
        ui.addItem('yudono', '湯殿の鍵', drawKeyIcon);
        clapScare();
      });
    case 'yudonoDoor':
      if (!state.hasYudonoKey) return say(MSG.yudonoLocked);
      audio.unlock(W.bath.doorPos);
      return say(MSG.yudonoOpen, () => {
        state.yudonoOpen = true;
        W.bath.H.yudonoDoor.userData.enabled = false;
        audio.slide(W.bath.doorPos, 0.9, 0.35);
      });
    case 'bathCard':
      W.bath.card.visible = false;
      W.bath.H.bathCard.userData.enabled = false;
      audio.burst(W.bath.poolPos, { type: 'lowpass', freq: 700, q: 0.6, dur: 0.6, gain: 0.3, attack: 0.05 });
      state.hasShobu = true;
      return say(MSG.bathCard, () => ui.addItem('shobu', '菖蒲の札', drawCardIcon('shobu')));

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
  // 最後の場面で使う影を、錠の画面を開いているあいだに用意しておく（切り替えの一瞬の引っかかりを隠す）
  W.genkan.scareSpot.castShadow = true;
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
// 驚かせ1：鏡台を調べると、鏡に女将の黒い影が0.5秒映る。振り向いても誰もいない
function mirrorScare() {
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const side = new THREE.Vector3(-f.z, 0, f.x);
  mirrorFigure.position.copy(player.pos).addScaledVector(f, -1.05).addScaledVector(side, 0.12);
  mirrorFigure.position.y = 0;
  mirrorFigure.rotation.y = player.yaw + Math.PI;
  mirrorFigureOn = true;
  // 行灯がふっと燃え上がり、背後の壁が明るくなる（黒い人影が浮かぶ）
  W.shobu.andonLamp.level = 2.4;
  // 同じ場所に影も落ちる
  okami.position.copy(mirrorFigure.position);
  okami.rotation.y = mirrorFigure.rotation.y;
  audio.breath(okami.position.clone().setY(1.4), 0.25);
  audio.drone(3, 0.1);
  flashUntil = now() + 0.5;
  setTimeout(() => {
    mirrorFigureOn = false;
    W.shobu.andonLamp.level = 1;
    showOkami(false);
    setTimeout(() => {
      state.mirrorSeen = true;
      say(MSG.mirrorAfter);
    }, 500);
  }, 500);
}

// 大広間で鍵を取ると、誰もいない舞台の方で三度、手が打たれる
function clapScare() {
  const at = W.hiroma.stagePos;
  W.hiroma.lamps.forEach((l) => (l.level = 0.35));
  [900, 1900, 2900].forEach((ms) => setTimeout(() => audio.burst(at, { type: 'bandpass', freq: 1500, q: 1.2, dur: 0.09, gain: 0.7 }), ms));
  setTimeout(() => {
    W.hiroma.lamps.forEach((l) => (l.level = 1));
    say(MSG.claps);
  }, 3900);
}

// 驚かせ2：最後の札（桔梗の札）を取ると、廊下の提灯がすべて消えて、襖の外を足音が通り過ぎる
function lanternScare() {
  // ここから足音が菖蒲の間に入るまで、操作を止めて映画のように見せる
  state.phase = 'scene';
  releasePointer();
  ui.cinema(true);
  const lan = W.corridor.lanterns;
  [3, 2, 1, 0].forEach((idx, k) => {
    setTimeout(() => {
      lan[idx].lamp.level = 0;
      lan[idx].paper.material.emissiveIntensity = 0;
      audio.snuff(lan[idx].lamp.pos);
    }, 600 + k * 700);
  });
  setTimeout(() => ui.caption(MSG.kikyoScare[0]), 3200);
  const end = walkingFootsteps(4400);
  setTimeout(() => ui.caption(MSG.walkerFar), 4600);
  setTimeout(() => ui.caption(MSG.walkerNear), end - 4200);
  setTimeout(() => ui.caption(MSG.walkerIn), end + 1400);
  setTimeout(() => {
    ui.cinema(false);
    state.phase = 'play';
    state.lanternsOut = true;
    player.requestLock();
  }, end + 4200);
}

// 大広間の奥の舞台から、誰かが歩き出す。広間を抜け、渡り廊下から廊下へ。
// 三つ並んだ客室の真ん中、菖蒲の間の前で止まる。足音が終わる時刻（ms）を返す
function walkingFootsteps(start) {
  const route = [[14.3, 9.4], [14.5, 4.4], [14.6, 2.7], [10.6, 2.7], [4.64, 2.6]];
  const pts = [];
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, az] = route[i], [bx, bz] = route[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.72));
    for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  pts.push(route[route.length - 1]);
  pts.forEach(([x, z], i) => {
    setTimeout(() => {
      const pos = new THREE.Vector3(x, 0, z);
      if (z > 3.6) audio.burst(pos, { type: 'lowpass', freq: 650, q: 0.6, dur: 0.18, gain: 0.5, attack: 0.03 }); // 畳
      else audio.stepWood(pos, 0.55);
    }, start + i * 520);
  });
  const end = start + pts.length * 520;
  return end;
}

// 驚かせ3：花札錠が開く直前、灯りが細り、廊下側からの明かりで背後に立つ女将の影が壁に伸びる。
// 「お帰りですか」の声に振り向いても、そこには誰もいない
let turnAnim = null;
let camAnim = null;
function genkanScare() {
  state.phase = 'scene';
  ui.cinema(true);
  const Gk = W.genkan;
  audio.unlock(Gk.lockPos);
  // 一歩下がって、錠の脇の壁を見る
  setTimeout(() => {
    const to = new THREE.Vector3(9.2, 0, 6.15);
    const target = new THREE.Vector3(9.6, 0.95, 7.4);
    const dx = target.x - to.x, dz = target.z - to.z;
    camAnim = {
      t0: now(), dur: 1.4, from: player.pos.clone(), to: to.setY(player.pos.y),
      fromYaw: player.yaw, toYaw: player.yaw + (((Math.atan2(-dx, -dz) - player.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI),
      fromPitch: player.pitch, toPitch: Math.atan2(target.y - EYE - player.floorY, Math.hypot(dx, dz)),
    };
  }, 500);
  // 灯りが細り、背後に影の主が立つ
  setTimeout(() => {
    Gk.domaLamp.level = 0.12;
    Gk.lanternLamp.level = 0.18;
    audio.snuff(Gk.lanternLamp.pos);
    const sp = Gk.scareSpot;
    const dir = player.pos.clone().sub(sp.position).setY(0).normalize();
    const p = player.pos.clone().addScaledVector(dir, -0.9);
    okami.position.set(p.x, player.floorAt(p.x, p.z), p.z);
    okami.rotation.y = Math.atan2(dir.x, dir.z);
    sp.shadow.autoUpdate = true;
    // 影をはっきり見せる：壁を強く照らし、周りの薄明かりを落として影を黒く、輪郭を鋭くする
    scareRamp = { t0: now(), from: 0, to: 32, dur: 1.4 };
    hemi.intensity = 0.12;
    Gk.domaLamp.level = 0;
    Gk.lanternLamp.level = 0.05;
    audio.creak(okami.position.clone().setY(0.2), 0.2, 0.6);
  }, 2100);
  setTimeout(() => {
    audio.voice(MSG.okamiVoice);
    ui.subtitle(`「${MSG.okamiVoice}」`, 2400);
    audio.breath(okami.position.clone().setY(1.4), 0.2);
  }, 4200);
  setTimeout(() => {
    turnAnim = { t0: now(), from: player.yaw, to: player.yaw + Math.PI, fromPitch: player.pitch, dur: 1.5 };
  }, 5600);
  // 振り向く途中で影は消える
  setTimeout(() => {
    showOkami(false);
    scareRamp = { t0: now(), from: W.genkan.scareSpot.intensity, to: 0, dur: 0.4 };
  }, 6300);
  setTimeout(() => {
    G.film.uniforms.fade.value = 1;
    audio.drone(4, 0.12);
    setTimeout(endingA, 1800);
  }, 7600);
}
let scareRamp = null;

// ---------------------------------------------------------------- エンディング
function finish(key, title, lines, note) {
  ui.cinema(false);
  state.phase = 'end';
  releasePointer();
  $('reticle').hidden = true;
  save.seen[key] = true;
  if (key === 'A') save.clearCount += 1;
  // クリア時間と、その結末の最短記録
  const sec = playSeconds();
  save.best = save.best || {};
  const prevBest = save.best[key];
  const isBest = !prevBest || sec < prevBest;
  if (isBest) save.best[key] = sec;
  $('endTime').textContent = `クリア時間　${formatTime(sec)}`;
  $('endBest').textContent = isBest && prevBest ? '最短記録を更新しました' : prevBest ? `この結末の最短　${formatTime(prevBest)}` : '';
  $('endBest').hidden = !$('endBest').textContent;
  writeSave(save);
  // 「すべて見届けた」は、三つの結末を見終えたときだけ出す
  const left = ['A', 'B', 'C'].filter((k) => !save.seen[k]).length;
  if (left === 0) note = '丑三つの旅館の結末を、すべて見届けました。';
  else if (key === 'C' || !note) note = `まだ見ていない結末が、あと${['', '一つ', '二つ'][left]}ある。`;
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
  fadeOut(3, () => finish('C', '終　真相', MSG.endC));
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
// クリア時間は、目覚めて動けるようになってからエンディングまで。一時停止のあいだは数えない
let pausedAt = 0;
let pausedTotal = 0;
function playSeconds() {
  return state.gameStart ? now() - state.gameStart - pausedTotal - (pausedAt ? now() - pausedAt : 0) : 0;
}
function formatTime(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60}分${s % 60}秒` : `${m}分${String(s % 60).padStart(2, '0')}秒`;
}
function openPause() {
  state.paused = true;
  if (!pausedAt) pausedAt = now();
  $('pause').hidden = false;
}
function closePause() {
  if (pausedAt) pausedTotal += now() - pausedAt;
  pausedAt = 0;
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
function applyQuality(name) {
  G.setQuality(name);
  shadowLight.shadow.mapSize.setScalar(Math.max(G.shadowSize, 1024));
  shadowLight.shadow.map?.dispose();
  shadowLight.shadow.map = null;
  shadowLight.shadow.needsUpdate = true;
  pool.forEach((l, i) => (l.visible = i < G.quality.lights));
  // 低画質では月明かりの影を省く（影は女将の影など、灯りの影だけにする）
  W.tsubaki.moon.castShadow = W.watari.moon.castShadow = G.quality.moonShadows;
  W.tsubaki.moon.shadow.needsUpdate = W.watari.moon.shadow.needsUpdate = true;
  W.shobu.mirror.getRenderTarget().setSize(G.quality.mirror, G.quality.mirror);
}
qual.addEventListener('change', () => {
  save.settings.quality = qual.value;
  save.settings.qualityAuto = false; // 自分で選んだら自動調整はしない
  applyQuality(qual.value);
  writeSave(save);
});
applyQuality(save.settings.quality);

// 画質の自動調整：遊び始めの数秒の速さを測り、重ければ一段ずつ下げる
const fpsProbe = { t0: 0, frames: 0 };
function autoQuality(t) {
  if (save.settings.qualityAuto === false || state.phase !== 'play') return;
  if (!fpsProbe.t0) {
    fpsProbe.t0 = t;
    fpsProbe.frames = 0;
    return;
  }
  fpsProbe.frames++;
  const span = t - fpsProbe.t0;
  if (span < 3) return;
  const fps = fpsProbe.frames / span;
  fpsProbe.t0 = t;
  fpsProbe.frames = 0;
  const order = ['high', 'medium', 'low'];
  const i = order.indexOf(save.settings.quality);
  if (fps < 45 && i < 2) {
    save.settings.quality = order[i + 1];
    qual.value = save.settings.quality;
    applyQuality(save.settings.quality);
    writeSave(save);
    ui.subtitle(`動きが重いので、画質を「${['高', '中', '低'][i + 1]}」にしました（Esc の設定で変えられます）`, 3600);
  }
}
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
    const lv = zn.lv ?? 0;
    if (lv !== 'any' && lv !== player.level) continue;
    const [x0, x1, z0, z1] = zn.r;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return zn.name;
  }
  return player.level === 1 ? 'f2' : 'corridor';
}
// 区画のつながり。条件が真のあいだ、互いの灯りが見える（閉じた部屋の灯りは消して、壁越しの光漏れを防ぐ）
const LINKS = [
  ['tsubaki', 'corridor', () => state.doorAnim > 0.01],
  ['shobu', 'corridor', () => state.shobuAnim > 0.01],
  ['kikyo', 'corridor', () => state.kikyoAnim > 0.01],
  ['choba', 'corridor', () => true],
  ['genkan', 'corridor', () => true],
  ['corridor', 'stairs', () => true],
  ['corridor', 'watari', () => true],
  ['stairs', 'f2', () => true],
  ['f2', 'matsu', () => true],
  ['f2', 'take', () => true],
  ['watari', 'garden', () => true],
  ['watari', 'hiroma', () => state.hiromaAnim > 0.01],
  ['watari', 'datsui', () => state.yudonoAnim > 0.01],
  ['datsui', 'roten', () => true],
];
function visibleZones(zone) {
  const v = new Set([zone]);
  for (const [a, b, ok] of LINKS) {
    if (!ok()) continue;
    if (a === zone) v.add(b);
    if (b === zone) v.add(a);
  }
  return v;
}

let shadowLamp = null;
let lastShadowLamp = undefined;
let lastShadowAt = 0;
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
  // 二周目：影の主がいるあいだ、近くの廊下の提灯が影を落とす
  if (okamiArrived && !forcedLamp && player.pos.distanceTo(OKAMI_SPOT) < 4.5) {
    const lan = W.corridor.lanterns[2].lamp;
    if (lan.vis > 0.3 && lan.level > 0.1) best = lan;
  }
  if (forcedLamp && forcedLamp.vis > 0.3) best = forcedLamp;
  shadowLamp = best;
  // 影を落とす灯り以外を、明るく近い順に光源へ割り当てる
  const ranked = ctx.lamps
    .filter((L) => L !== best && L.now > 0.02)
    .map((L) => ({ L, s: L.now / Math.max(1, L.pos.distanceToSquared(player.pos)) }))
    .sort((a, b) => b.s - a.s);
  pool.forEach((light, i) => {
    const L = ranked[i]?.L;
    if (!L) return void (light.intensity = 0);
    light.position.copy(L.pos);
    light.color.setHex(L.color);
    light.intensity = L.now;
    light.distance = L.distance ?? 6;
  });
  const animating = ['doorAnim', 'oshiireAnim', 'shobuAnim', 'kikyoAnim', 'hiromaAnim', 'yudonoAnim'].some((k) => state[k] > 0 && state[k] < 1);
  if (best !== lastShadowLamp || animating || okami.position.y > -10) {
    shadowLight.shadow.needsUpdate = true;
    lastShadowLamp = best;
    lastShadowAt = t;
  }
  if (best) {
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
  W.tsubaki.oshiireLamp.level = state.oshiireAnim;
  W.shobu.door.open(anim('shobuOpen', 'shobuAnim', 1.0));
  W.kikyo.door.open(anim('kikyoOpen', 'kikyoAnim', 1.2));
  W.watari.hiromaDoor.open(anim('hiromaOpen', 'hiromaAnim', 1.0));
  W.bath.open(anim('yudonoOpen', 'yudonoAnim', 0.9));
  W.bath.update(t, vis.has('roten') || vis.has('datsui'));
  // 屋外は見えているときだけ月明かりと池の映り込みを描く
  const outside = G.quality.moonShadows ? vis.has('garden') || vis.has('watari') || vis.has('roten') : zone === 'garden' || zone === 'roten';
  W.watari.moon.intensity = outside ? 150 : 0;
  W.tsubaki.moon.intensity = vis.has('tsubaki') ? 90 : 0;
  if (vis.has('garden')) W.watari.pond.userData.update(t);

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
        else if (half % 2 === 0) audio.burst(src.pos, { type: 'bandpass', freq: 1400, q: 3, dur: 0.05, gain: 0.05 });
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
  mirrorFigure.userData.update(t);

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
      // 宿じゅうの明かりが消え、影の主の向こう（帳場寄りの奥）に提灯がひとつだけ灯る。
      // 桔梗の間から出てくると、手前の壁に女将の横顔の影が落ち、その奥で提灯が灯っている
      const lan = W.corridor.lanterns[2];
      for (const L of ctx.lamps) L.level = 0;
      lan.group.position.set(3.3, 1.65, 2.25);
      lan.lamp.pos.set(3.3, 1.58, 2.25);
      lan.lamp.level = 2.7;
      lan.lamp.paperBase = 1.3;
      lan.lamp.distance = 9;
      hemi.intensity = 0.18;
      W.choba.shoji.material.emissiveIntensity = 0;
      audio.snuff(player.pos.clone());
      audio.drone(4, 0.08);
      setTimeout(() => ui.subtitle('……どこかで、提灯がひとつ灯った。', 3200), 900);
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
    if (camAnim) {
      const k = ease(Math.min(1, (t - camAnim.t0) / camAnim.dur));
      player.pos.lerpVectors(camAnim.from, camAnim.to, k);
      player.yaw = lerp(camAnim.fromYaw, camAnim.toYaw, k);
      player.pitch = lerp(camAnim.fromPitch, camAnim.toPitch, k);
      if (k >= 1) camAnim = null;
    }
    if (scareRamp) {
      const k = Math.min(1, (t - scareRamp.t0) / scareRamp.dur);
      W.genkan.scareSpot.intensity = lerp(scareRamp.from, scareRamp.to, k);
      if (k >= 1) scareRamp = null;
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

  autoQuality(t);
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
    if (['tsubaki', 'shobu', 'kikyo', 'hiroma', 'matsu', 'take'].includes(zone)) audio.stepTatami();
    else if (zone === 'garden') audio.burst(null, { type: 'highpass', freq: 1800, q: 0.6, dur: 0.16, gain: 0.027, attack: 0.01 });
    else if (zone === 'roten' && player.floorY < -0.3) audio.burst(W.bath.poolPos.clone().set(p.x, -0.2, p.z), { type: 'bandpass', freq: 500, q: 0.8, dur: 0.35, gain: 0.12, attack: 0.04 });
    else if (zone === 'roten' || player.floorY < -0.2) audio.burst(null, { type: 'lowpass', freq: 900, q: 0.7, dur: 0.12, gain: 0.25 });
    else audio.stepWood(new THREE.Vector3(p.x, 0, p.z), 0.28);
  }
  // 足音の残響（FootstepEcho）：廊下で止まると、少し遅れてもう一歩
  if (moved > 0.0005) {
    stillTime = 0;
    if (zone === 'corridor' || zone === 'watari' || zone === 'f2') echoArmed = true;
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
      // 場所に入っただけでは字幕を出さない（文章は調べたときだけ）
      if (zone === 'take') {
        // 竹の間に入ると、背後の廊下を小さな足音が走り抜ける（音だけ）
        for (let i = 0; i < 6; i++) setTimeout(() => audio.stepWood(new THREE.Vector3(-5.8, 2.75, 9.2 - i * 1.2), 0.6), 900 + i * 230);
      }
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
  state, player, ui, act, W, save, G,
  focus: () => focus,
  debugMirror(on) {
    const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const side = new THREE.Vector3(-f.z, 0, f.x);
    mirrorFigure.position.copy(player.pos).addScaledVector(f, -1.05).addScaledVector(side, 0.12);
    mirrorFigure.position.y = 0;
    mirrorFigure.rotation.y = player.yaw + Math.PI;
    okami.position.copy(mirrorFigure.position);
    okami.rotation.y = mirrorFigure.rotation.y;
    mirrorFigureOn = on;
    W.shobu.andonLamp.level = on ? 2.4 : 1;
  },
  look(x, z, tx, ty, tz, level = 0) {
    player.level = level;
    player.pos.set(x, EYE, z);
    player.floorY = player.floorAt(x, z);
    const dx = tx - x, dy = ty - EYE - player.floorY, dz = tz - z;
    player.yaw = Math.atan2(-dx, -dz);
    player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  },
};
