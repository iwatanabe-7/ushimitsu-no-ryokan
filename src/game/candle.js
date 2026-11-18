// 手燭と女将の影（docs/GDD.md 2章）
// 火を点ければ見えるが、見られる。暗がりで火を点けていると「気配」が溜まり、
// 女将（姿は映らず、影だけを落とす人形）が手燭の灯りの届くところに立って、近づいてくる。
// 見つかってもゲームオーバーにはせず、最後にいた明るい場所に戻す。
//
// 計算（気配・段階・暗がり）は kehai.js の純粋な関数。ここは見た目・音・進行へのつなぎ込み。
// 毎フレームの処理では new しない（作業用の Vector3 などは使い回す）
import * as THREE from 'three';
import { BALANCE as B } from './balance.js';
import { isDarkScore, stepDark, stepKehai, stageOf, shouldCatch } from './kehai.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const BASE_EXPOSURE = 1.45; // renderer.js の toneMappingExposure と同じ
// 暗がりで火がないと読めない物（GDD 2.7）。鏡台は引き出しの紙片を読むとき（main.js が驚かせのあとだけ渡す）
const READABLE = new Set(['diary', 'matsuNote', 'takeNote', 'fudakake', 'ledger', 'shobuScroll', 'kakejiku', 'letter', 'mirror']);

export function createCandle(d) {
  const { scene, camera, player, state, ui, audio, okami, G, MSG, later, walls } = d;

  // ---------------------------------------------------------- 見た目（カメラの子。影は落とさない。壁にめり込んでも見えるよう最前面に描く）
  if (!camera.parent) scene.add(camera);
  const hand = new THREE.Group();
  hand.position.set(B.CandleOffsetRight, -B.CandleOffsetDown, -B.CandleOffsetForward);
  camera.add(hand);
  const front = (m, order) => {
    m.material.depthTest = false;
    m.material.depthWrite = false;
    m.renderOrder = 1000 + order;
    m.castShadow = m.receiveShadow = false;
    m.frustumCulled = false;
    return m;
  };
  // 手元の手燭は、すぐそばの自分の火で真っ白に飛ばないよう、光を受けない材質で描く
  const brass = new THREE.MeshBasicMaterial({ color: 0x6a4a24 });
  const dish = front(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.012, 24), brass), 0);
  hand.add(dish);
  const grip = front(new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), brass.clone()), 1);
  grip.position.set(0.055, 0, 0);
  grip.rotation.x = Math.PI / 2;
  hand.add(grip);
  const wax = front(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.07, 14), new THREE.MeshBasicMaterial({ color: 0xb8a078 })), 2);
  wax.position.y = 0.041;
  hand.add(wax);
  const flameRoot = new THREE.Group(); // 炎の根元。傾けるときはここを回す
  flameRoot.position.y = 0.078;
  hand.add(flameRoot);
  const flame = front(new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffc070 })), 3);
  flame.position.y = 0.012;
  flameRoot.add(flame);
  hand.visible = false;

  // 燐寸（マッチ）。左手から差し出して芯に火を移す。カメラの子
  const match = new THREE.Group();
  camera.add(match);
  const stick = front(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.07), new THREE.MeshBasicMaterial({ color: 0x9a7a4a })), 4);
  stick.position.z = 0.035;
  match.add(stick);
  const head = front(new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5a1a10 })), 5);
  match.add(head);
  const matchFlame = front(new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb860 })), 6);
  matchFlame.position.y = 0.006;
  match.add(matchFlame);
  match.rotation.set(0, -0.9, 0); // 左下から、芯の方へ斜めに差し出す
  match.visible = false;
  const MATCH_FROM = new THREE.Vector3(-0.3, -0.5, -0.42);
  const MATCH_AT = new THREE.Vector3(); // 芯の少し左（毎回、手燭の位置から決める）

  // 吹き消したあとの細い煙（ワールドに置く。手を下げても、その場で立ちのぼる）
  const smokeTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 32;
    const x = cv.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(200,200,205,0.55)');
    g.addColorStop(1, 'rgba(200,200,205,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(cv);
  })();
  const smoke = [];
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.visible = false;
    sp.userData = { born: 0, ox: 0, oz: 0 };
    scene.add(sp);
    smoke.push(sp);
  }
  let smokeT = -1;
  const smokeAt = new THREE.Vector3();

  // ---------------------------------------------------------- 状態
  const c = {
    lit: false, // 火が点いているか（点け直しの途中は false）。帳場の手燭を手に入れたとき点く
    level: 0, // 炎の大きさ 0..1
    mode: null, // 'blow' | 'light' | null
    modeT: 0,
    dark: { dark: false, t: 0 },
    kehai: { k: 0, sinceRise: 0, grace: 0 },
    stage: 0,
    adapt: 1, // 目の慣れ（明るさの倍率）
    adaptT: 0,
    vig: 0,
    okamiOn: false,
    parkT: -1,
    lookAway: 0,
    caught: 0,
    busy: false, // 見つかる演出の最中
    fade: null,
    safe: { has: false, x: 0, z: 0, yaw: 0, level: 0 },
    brightT: 0,
    seen: {},
    shadowAt: -1,
    shadowUpdates: 0,
    debugMul: 1, // 調整用：手燭の明るさの倍率
    hold: false, // 気配を、最初に暗がりに入るまで引かせない（驚かせ2のあと）
    sceneMul: 1, // 演出で手燭を細らせる倍率（驚かせ3）
    near: 1, // 壁に近いときに弱める倍率（まぶしさ対策）
    nearAt: 0,
    noShadow: false, // 演出のあいだ、手燭は影を落とさない（演出の灯りの影を邪魔しない）
  };
  const pos = new THREE.Vector3(); // 手燭の炎の位置（ワールド）
  const lastShadowPos = new THREE.Vector3(1e9, 0, 0);
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const qInv = new THREE.Quaternion();
  const ray = new THREE.Raycaster();
  const hits = [];
  const input = { dark: false, lit: true, awake: false, moving: false, reading: false, modal: false, lap2: false, caughtCount: 0, mul: 1 }; // 毎フレーム使い回す
  let swayPhase = 0;

  const canToggle = () => state.phase === 'play' && !state.paused && !ui.talking && !ui.modal && !c.busy;
  const once = (key, fn) => {
    if (c.seen[key]) return;
    c.seen[key] = true;
    fn();
  };

  function toggle() {
    if (!canToggle()) return false;
    flamePos();
    if (c.mode === 'light') {
      // 点けている途中でもう一度押すとやめる（燐寸を下げる）
      c.mode = 'matchAway';
      c.modeT = 0;
      c.level = 0;
      return true;
    }
    if (c.mode === 'blow' || c.mode === 'matchAway') return false; // 動作の途中は受け付けない
    if (c.locked) {
      // 手紙のあとは、燐寸を擦っても点かない
      audio.strike(pos.clone());
      ui.subtitle(MSG.candleDead, 2600);
      return false;
    }
    if (c.lit) {
      c.lit = false;
      c.mode = 'blow';
      c.modeT = 0;
      c.adapt = B.DarkAdaptStart;
      c.adaptT = 0;
      if (c.dark.dark) {
        once('blow', () => ui.subtitle(MSG.blowFirst, 2600));
        later(() => c.dark.dark && !c.lit && once('adapt', () => ui.subtitle(MSG.adaptFirst, 2400)), B.DarkAdaptTime * 1000);
      }
    } else {
      c.mode = 'light';
      c.modeT = 0;
      c.struck = false;
    }
    return true;
  }

  // 燐寸を当てる位置：芯の少し左（手燭の位置に合わせる）
  function wickPoint() {
    MATCH_AT.set(hand.position.x - 0.03, hand.position.y + 0.08, hand.position.z + 0.02);
  }
  function startSmoke() {
    smokeAt.copy(flamePos());
    smokeT = d.clock();
    smoke.forEach((sp, i) => {
      sp.visible = true;
      sp.userData.born = smokeT + i * 0.12;
      sp.userData.ox = (Math.random() - 0.5) * 0.02;
      sp.userData.oz = (Math.random() - 0.5) * 0.02;
    });
  }
  function updateSmoke() {
    if (smokeT < 0) return;
    const now = d.clock();
    let alive = false;
    for (const sp of smoke) {
      const a = (now - sp.userData.born) / B.SmokeTime;
      if (a < 0) {
        sp.material.opacity = 0;
        alive = true;
        continue;
      }
      if (a >= 1) {
        sp.visible = false;
        continue;
      }
      alive = true;
      // 細くゆらぎながら立ちのぼり、広がって薄れる
      sp.position.set(smokeAt.x + sp.userData.ox + Math.sin(a * 9 + sp.userData.ox * 300) * 0.012 * a, smokeAt.y + a * 0.35, smokeAt.z + sp.userData.oz);
      const s = 0.008 + a * 0.035; // 細い煙。目の前なので小さく薄く
      sp.scale.set(s, s * 2.2, s);
      sp.material.opacity = 0.22 * (1 - a) * Math.min(1, a * 6);
    }
    if (!alive) smokeT = -1;
  }

  function relight() {
    c.lit = true;
    c.level = 1;
    c.mode = null;
  }

  // 炎の位置（ワールド）を pos に入れる
  function flamePos() {
    flame.updateWorldMatrix(true, false);
    return pos.setFromMatrixPosition(flame.matrixWorld);
  }

  // 手燭から、まわりの壁までのいちばん近い距離（m）。歩ける範囲（壁からプレイヤーの半径ぶん内側）の端を探す。
  // レイを宿全体のまとめた壁に当てるより、ずっと軽い
  function wallDist() {
    flamePos();
    const R = player.radius ?? 0.22;
    let best = B.CandleNearFull;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dx = Math.sin(a), dz = Math.cos(a);
      for (let s = 0; s < best; s += 0.05) {
        if (!player.walkable(pos.x + dx * s, pos.z + dz * s)) {
          best = Math.min(best, s + R);
          break;
        }
      }
    }
    // 手燭そのものが歩ける範囲の外（壁から半径より近い）なら、いちばん近い扱い
    if (!player.walkable(pos.x, pos.z)) best = Math.min(best, R * 0.5);
    return best;
  }

  // ---------------------------------------------------------- 女将の立つ位置
  const forward = () => fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  // 手燭から dir（水平の単位ベクトル）へ dist の所に立てるか。立てるなら out に位置を入れる
  function tryStand(dir, dist, out) {
    const x = pos.x + dir.x * dist, z = pos.z + dir.z * dist;
    // 自分と同じ区画（暗がり）にだけ立つ。明るい隣の部屋に立つと影が灯りに紛れて見えない
    if (!player.walkable(x, z) || !d.sameZone(x, z)) return false;
    // 手燭からその位置まで壁にさえぎられないこと。影は人形の向こうの床と、まわりの壁・襖に落ちる
    // （狭い廊下では正面の壁が遠くても、床と両側の壁に長い影が伸びる）
    tmp2.set(pos.x, player.floorY + 1.1, pos.z);
    ray.set(tmp2, dir);
    ray.far = dist + 0.25;
    hits.length = 0;
    ray.intersectObjects(walls, true, hits);
    if (hits.length) return false;
    out.set(x, 0, z);
    nudgeToWall(dir, out);
    out.y = player.floorAt(out.x, out.z);
    return true;
  }
  // 横の壁（襖）が近ければ壁際に寄せる。手燭は女将の頭より低いので、通路の真ん中に立つと影は天井と奥へ逃げる。
  // 壁際なら、すぐ後ろの壁に等身大の影が落ちる
  const side = new THREE.Vector3();
  function nudgeToWall(dir, p) {
    let bestD = Infinity, sx = 0, sz = 0;
    for (const sgn of [1, -1]) {
      side.set(-dir.z * sgn, 0, dir.x * sgn);
      tmp2.set(p.x, player.floorY + 1.0, p.z);
      ray.set(tmp2, side);
      ray.far = B.OkamiWallReach;
      hits.length = 0;
      ray.intersectObjects(walls, true, hits);
      if (hits.length && hits[0].distance < bestD) {
        bestD = hits[0].distance;
        sx = side.x;
        sz = side.z;
      }
    }
    if (bestD === Infinity) return;
    const move = Math.max(0, bestD - B.OkamiWallGap);
    const nx = p.x + sx * move, nz = p.z + sz * move;
    if (player.walkable(nx, nz) || move < 0.6) {
      p.x = nx;
      p.z = nz;
    }
  }
  // 8方向から選ぶ。outOfView なら、今見ていない方向だけ
  function placeOkami(dist, outOfView) {
    if (!B.OkamiShadowEnabled) return (c.okamiOn = false);
    flamePos();
    forward();
    let bestScore = -Infinity;
    let found = false;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + player.yaw;
      tmp.set(Math.sin(a), 0, Math.cos(a));
      const away = Math.acos(Math.max(-1, Math.min(1, tmp.dot(fwd)))); // 視線からの角度
      if (outOfView && away < B.OkamiLookCone + 0.35) continue;
      if (!tryStand(tmp, dist, tmp2)) continue;
      const score = outOfView ? -Math.abs(away - Math.PI * 0.6) : -away; // 斜め後ろを好む／接近は正面寄り
      if (score > bestScore) {
        bestScore = score;
        okami.position.copy(tmp2);
        found = true;
      }
    }
    if (found) faceOkami();
    c.okamiOn = found;
    return found;
  }
  // 背後 dist m の位置（足元の高さ）
  function behind(dist) {
    return new THREE.Vector3().copy(player.pos).addScaledVector(forward(), -dist).setY(player.floorY);
  }
  function faceOkami() {
    okami.rotation.y = Math.atan2(player.pos.x - okami.position.x, player.pos.z - okami.position.z);
  }
  function parkOkami() {
    if (!c.okamiOn) return;
    c.okamiOn = false;
    d.showOkami(false);
  }
  // 女将を見ているか（視線から OkamiLookCone 以内）
  function looking() {
    forward();
    tmp.subVectors(okami.position, player.pos).setY(0).normalize();
    return Math.acos(Math.max(-1, Math.min(1, tmp.dot(fwd)))) < B.OkamiLookCone;
  }

  function onStage(prev, next) {
    if (next === 1 && prev === 0) {
      if (placeOkami(B.OkamiStage1Dist, true)) audio.stepWood(okami.position.clone(), 0.35);
      else audio.stepWood(behind(2.5), 0.3);
      once('stage1', () => ui.subtitle(MSG.stage1First, 2800));
    }
    if (next === 2) {
      if (!c.okamiOn) placeOkami(B.OkamiStage2Dist, true);
      else {
        // 今いる所から、まっすぐ寄る
        tmp.subVectors(okami.position, pos).setY(0);
        const dd = tmp.length();
        if (dd > B.OkamiStage2Dist) okami.position.addScaledVector(tmp.normalize(), B.OkamiStage2Dist - dd);
        okami.position.y = player.floorAt(okami.position.x, okami.position.z);
        faceOkami();
      }
      // 衣擦れと息。影を出さないときは、すぐ背後から聞こえる
      const at = c.okamiOn ? okami.position.clone() : behind(1.4);
      audio.burst(at.clone().setY(0.9), { type: 'bandpass', freq: 3200, q: 0.6, dur: 0.45, gain: 0.12, attack: 0.08 });
      later(() => (c.okamiOn || !B.OkamiShadowEnabled) && c.stage >= 2 && audio.breath(at.clone().setY(1.4), 0.15), 500);
      once('stage2', () => ui.subtitle(MSG.stage2First, 2800));
    }
    if (next === 0) parkOkami();
  }

  // ---------------------------------------------------------- 見つかる（GDD 2.9）
  function caught() {
    c.busy = true;
    const m = c.caught > 0 ? B.CaughtRepeatMul : 1;
    state.phase = 'scene';
    d.releasePointer();
    ui.cinema(true);
    // 背後 0.9m に影の主を立たせ、振り向かせる。手燭の灯りで、その向こうの壁いっぱいに影が落ちる
    forward();
    okami.position.copy(player.pos).addScaledVector(fwd, -B.CaughtOkamiDist);
    okami.position.y = player.floorAt(okami.position.x, okami.position.z);
    faceOkami();
    c.okamiOn = true;
    d.turn(B.CaughtTurnTime * m);
    const tTurn = B.CaughtTurnTime * m * 1000;
    const tHold = B.CaughtHoldTime * m * 1000;
    const tFade = B.CaughtFadeTime * m * 1000;
    later(() => {
      audio.breath(okami.position.clone().setY(1.4), 0.25);
      ui.subtitle(`「${MSG.caughtVoice}」`, tHold + 600);
    }, tTurn);
    // 火が吹き消され、暗転
    later(() => {
      c.lit = false;
      c.mode = 'blow';
      c.modeT = 0; // 吹き消す音は、炎が倒れるときに鳴る
      c.fade = { t0: d.clock(), dur: tFade / 1000, from: 0, to: 1 };
    }, tTurn + tHold);
    // 最後の明るい場所で明ける
    later(() => {
      parkOkami();
      d.clearTurn();
      const s = c.safe;
      if (s.has) {
        player.level = s.level;
        player.pos.set(s.x, player.pos.y, s.z);
        player.floorY = player.floorAt(s.x, s.z);
        player.yaw = s.yaw;
        player.pitch = 0;
      }
      relight();
      c.kehai.k = 0;
      c.kehai.sinceRise = 0;
      c.stage = 0;
      c.dark.dark = false;
      c.dark.t = 0;
      c.adapt = 1;
      c.caught++;
      state.caught = c.caught;
      c.fade = { t0: d.clock(), dur: 0.8 * m, from: 1, to: 0 };
      ui.cinema(false);
      state.phase = 'play';
      c.busy = false;
      player.requestLock();
      ui.subtitle(MSG.caughtWake, 2600);
      if (c.caught === 1) later(() => ui.subtitle(player.isTouch ? MSG.caughtHintTouch : MSG.caughtHint, 4200), 2800);
    }, tTurn + tHold + tFade + 200);
  }

  // ---------------------------------------------------------- 毎フレーム
  // 灯りの割り当ての前に呼ぶ。手燭が影の灯りを受け持つなら true を返す
  function wantsShadow() {
    return wantsLight() && !c.noShadow;
  }
  // 火が見えているか（影を落とさないときも、影なしの光源として照らす）
  function wantsLight() {
    return hand.visible && c.level > 0.02;
  }

  // 手燭の灯りの位置・色・強さを light に入れる（影の有無は呼ぶ側が決める）
  function setLight(light, t) {
    flamePos();
    let fl = 1 + Math.sin(t * 9.1) * B.CandleFlicker * 0.6 + (Math.random() - 0.5) * B.CandleFlicker;
    if (c.stage >= 2) fl *= 1 + (Math.random() - 0.5) * 2 * B.FlameJitter2;
    light.position.copy(pos);
    light.color.setHex(B.CandleColor);
    light.intensity = B.CandleIntensity * c.level * c.sceneMul * c.near * fl * c.debugMul;
    light.distance = B.CandleDistance;
  }

  // 影の灯りの設定と、描き直しの間引き。owner が手燭のときだけ呼ぶ
  function driveShadowLight(light, t, quality) {
    setLight(light, t);
    const hz = c.okamiOn ? (quality === 'high' ? Infinity : B.CandleShadowHzActive) : quality === 'low' ? B.CandleShadowHzLow : B.CandleShadowHzIdle;
    const moved = pos.distanceToSquared(lastShadowPos) >= B.CandleShadowMoveEps * B.CandleShadowMoveEps;
    if ((moved || c.okamiOn) && t - c.shadowAt >= 1 / hz) {
      light.shadow.needsUpdate = true;
      lastShadowPos.copy(pos);
      c.shadowAt = t;
      c.shadowUpdates++;
    }
  }

  // dt はゲーム内時間（一時停止中は 0）。darkScore は手燭以外の灯りの強さの最大。moved はこのフレームに歩いた距離
  function update(dt, { darkScore, moved, t }) {
    const playing = state.phase === 'play' || state.phase === 'scene';
    hand.visible = playing && d.handReady();
    if (!hand.visible) return;

    // 炎の点け消し（手の動き・燐寸・煙）
    let pose = 0; // 0 手元 … 1 口元
    let blowLean = 0; // 息で炎が奥へ倒れる
    match.visible = false;
    if (c.mode === 'blow') {
      c.modeT += dt;
      const t1 = B.BlowLiftTime, t2 = t1 + B.BlowOutTime, t3 = t2 + B.BlowReturnTime;
      const m = c.modeT;
      if (m < t1) pose = c.gust ? 0 : ease(m / t1);
      else if (m < t2) {
        pose = c.gust ? 0 : 1;
        const k = (m - t1) / B.BlowOutTime;
        if (!c.blown) {
          c.blown = true;
          if (!c.gust) audio.snuff(flamePos().clone()); // ふっ（手紙のあとに勝手に消えるときは鳴らさない）
        }
        blowLean = Math.min(1, k * 2.2);
        c.level = Math.max(0, 1 - k);
      } else {
        c.level = 0;
        if (c.blown) {
          c.blown = false;
          startSmoke();
        }
        pose = c.gust ? 0 : 1 - ease(Math.min(1, (m - t2) / B.BlowReturnTime));
        if (m >= t3) {
          c.mode = null;
          c.gust = false;
        }
      }
    } else if (c.mode === 'light') {
      c.modeT += dt;
      const m = c.modeT;
      match.visible = true;
      wickPoint();
      if (m < B.MatchStrikeAt) {
        // 左手の燐寸を、芯の脇まで寄せる（まだ火はない）
        match.position.lerpVectors(MATCH_FROM, MATCH_AT, ease(m / B.MatchStrikeAt) * 0.85);
        matchFlame.visible = false;
      } else {
        if (!c.struck) {
          c.struck = true;
          audio.strike(flamePos().clone());
        }
        const k = Math.min(1, (m - B.MatchStrikeAt) / (B.WickCatchAt - B.MatchStrikeAt));
        match.position.lerpVectors(MATCH_FROM, MATCH_AT, 0.85 + 0.15 * ease(k));
        matchFlame.visible = true;
        const flare = m - B.MatchStrikeAt < 0.12 ? 1.8 : 1; // 擦った瞬間だけ大きく
        matchFlame.scale.set(flare, flare * (1.6 + Math.sin(t * 23) * 0.3), flare);
        // 芯に火が移る
        if (m >= B.WickCatchAt) c.level = Math.min(1, (m - B.WickCatchAt) / (B.RelightTime - B.WickCatchAt));
      }
      if (m >= B.RelightTime) {
        relight();
        audio.ignite(flamePos().clone());
        c.mode = 'matchAway';
        c.modeT = 0;
      }
    } else if (c.mode === 'matchAway') {
      // 燐寸を振って火を消し、左下へ下げる
      c.modeT += dt;
      const k = Math.min(1, c.modeT / B.MatchAwayTime);
      match.visible = k < 1;
      match.position.lerpVectors(MATCH_AT, MATCH_FROM, ease(k));
      matchFlame.visible = k < 0.3;
      if (k >= 1) c.mode = null;
    }
    updateSmoke(t);
    flame.visible = c.level > 0.01;
    const fs = c.level * (0.4 + 0.6 * c.sceneMul); // 演出で細らせると、炎も小さくなる
    flame.scale.set(fs, (2.2 + Math.sin(t * 17) * 0.35) * fs, fs);

    // 壁に近いと弱める：すぐそばの壁が真っ白に飛んで目が痛くならないように（0.1秒ごと、歩ける範囲で測る）
    if (t - c.nearAt > 0.1) {
      c.nearAt = t;
      const wd = wallDist();
      c.nearTarget = Math.max(B.CandleNearMin, Math.min(1, (wd / B.CandleNearFull) ** 2));
    }
    c.near += ((c.nearTarget ?? 1) - c.near) * Math.min(1, dt * 8);

    // 歩くと少し揺れる
    if (moved > 0.0005) swayPhase += dt * 9;
    // 吹き消すときは、手燭を口元（画面の中央・少し上・手前）へ持ち上げる
    hand.position.x = lerp(B.CandleOffsetRight, 0.03, pose) + Math.sin(swayPhase * 0.5) * B.CandleWalkSway * 0.5;
    hand.position.y = lerp(-B.CandleOffsetDown, -0.17, pose) + Math.abs(Math.sin(swayPhase * 0.5)) * B.CandleWalkSway;
    hand.position.z = lerp(-B.CandleOffsetForward, -0.3, pose);

    // 暗がり（境目でちらつかないよう、続いたときに切り替える）
    const wasDark = c.dark.dark;
    const rawDark = isDarkScore(darkScore, B);
    if (state.phase === 'play' && !c.busy) stepDark(c.dark, rawDark, dt, B);
    if (c.hold && c.dark.dark) c.hold = false;
    if (c.dark.dark && !wasDark && c.lit && state.okamiAwake) once('dark', () => ui.subtitle(player.isTouch ? MSG.darkFirstTouch : MSG.darkFirst, 3600));
    const groping = c.dark.dark && c.level < 0.05;
    player.speedMul = groping ? B.DarkMoveSpeedMul : 1;

    // 目の慣れ：吹き消した直後は暗く、少しずつ見えてくる。火か明るい場所なら元に戻す
    if (groping) {
      c.adaptT += dt;
      const k = Math.min(1, c.adaptT / B.DarkAdaptTime);
      c.adapt = B.DarkAdaptStart + (B.DarkAdaptEnd - B.DarkAdaptStart) * k;
    } else {
      c.adaptT = 0;
      c.adapt += (1 - c.adapt) * Math.min(1, dt * 3);
    }
    G.renderer.toneMappingExposure = BASE_EXPOSURE * c.adapt;

    // 戻る場所：明るい場所に 1 秒以上いたら覚える
    // （切り替え待ちのあいだに暗がりへ入った位置を覚えないよう、今この瞬間も明るいことを見る）
    if (state.phase === 'play' && !c.dark.dark && !rawDark && !c.busy) {
      c.brightT += dt;
      if (c.brightT >= B.SafePointLitTime) Object.assign(c.safe, { has: true, x: player.pos.x, z: player.pos.z, yaw: player.yaw, level: player.level });
    } else c.brightT = 0;

    // 気配と段階
    // （驚かせ2のあとは、最初に暗がりに入るまで気配も段階もそのまま止めておく）
    if (state.phase === 'play' && !c.busy && dt > 0 && !c.hold) {
      input.dark = c.dark.dark;
      input.lit = c.lit;
      input.awake = !!state.okamiAwake;
      input.moving = moved > 0.0005;
      input.reading = ui.talking;
      input.modal = !!ui.modal;
      input.lap2 = state.lap2;
      input.caughtCount = c.caught;
      input.mul = d.kehaiMulAt ? d.kehaiMulAt(player.pos) : 1;
      stepKehai(c.kehai, input, dt, B);
      const next = stageOf(c.kehai.k, c.stage, B);
      if (next !== c.stage) {
        const prev = c.stage;
        c.stage = next;
        onStage(prev, next);
      }
      // 段階2：見ていないあいだだけ近づく。長く見ていなければ背後へ回り込む
      if (c.stage >= 2 && c.okamiOn && c.lit) {
        if (looking()) c.lookAway = 0;
        else {
          c.lookAway += dt;
          tmp.subVectors(pos, okami.position).setY(0);
          const dd = tmp.length();
          if (dd > B.OkamiMinDist) {
            okami.position.addScaledVector(tmp.normalize(), Math.min(dd - B.OkamiMinDist, B.OkamiCreepSpeed * dt));
            okami.position.y = player.floorAt(okami.position.x, okami.position.z);
          }
          faceOkami();
          if (c.lookAway > B.OkamiFlankAfter) {
            c.lookAway = 0;
            const keep = okami.position.clone();
            if (!placeOkami(Math.max(B.OkamiMinDist, Math.min(dd, B.OkamiStage2Dist)), true)) {
              okami.position.copy(keep);
              c.okamiOn = true;
            }
          }
        }
      }
      // 火を消したら、少し置いて女将を下げる（光がないので影はもともと見えない）
      if (!c.lit && c.okamiOn) {
        c.parkT = c.parkT < 0 ? dt : c.parkT + dt;
        if (c.parkT >= B.OkamiParkDelay) parkOkami();
      } else c.parkT = -1;
      if (B.CatchEnabled && shouldCatch(c.kehai, input)) caught();
    }

    // 炎の手がかり：女将の方へ傾く
    let lean = c.stage >= 2 ? B.FlameLean2 : c.stage === 1 ? B.FlameLean1 : 0;
    if (!c.lit) lean = 0;
    if (blowLean) {
      flameRoot.rotation.set(-blowLean * 1.1, 0, Math.sin(t * 40) * 0.15 * blowLean); // 息で奥へ倒れ、震える
    } else if (lean) {
      // 女将の方へ傾く。影を出さないときは、背後へ引かれるように傾く
      camera.getWorldQuaternion(qInv).invert();
      if (c.okamiOn) tmp.subVectors(okami.position, pos).setY(0).normalize();
      else tmp.copy(forward()).negate();
      tmp.applyQuaternion(qInv);
      flameRoot.rotation.set(-tmp.z * lean, 0, -tmp.x * lean);
    } else {
      flameRoot.rotation.set(Math.sin(t * 2.3) * 0.04, 0, Math.sin(t * 1.7) * 0.05);
    }

    // 画面のふち（ビネット）
    const vigTarget = c.lit && c.dark.dark ? (c.kehai.k / 100) * B.VignetteMax : 0;
    c.vig += (vigTarget - c.vig) * Math.min(1, dt * 2);
    G.film.uniforms.vig.value = c.vig;

    // 暗転（見つかる演出）
    if (c.fade) {
      const k = Math.min(1, (d.clock() - c.fade.t0) / c.fade.dur);
      G.film.uniforms.fade.value = c.fade.from + (c.fade.to - c.fade.from) * k;
      if (k >= 1) c.fade = null;
    }
  }

  // 手燭が影の灯りを受け持っていないとき（別の灯りに渡したとき）、次に受け持つときに必ず描き直す
  function releaseShadow() {
    lastShadowPos.set(1e9, 0, 0);
    c.shadowAt = -1;
  }

  // 暗がりで火がないと読めない物
  const tooDark = (id) => READABLE.has(id) && c.dark.dark && c.level < 0.5;

  // 気配を足す（花札錠の罰）。画面のあいだは KehaiReadCap で止まる
  function addKehai(n) {
    c.kehai.k = Math.min(ui.modal || ui.talking ? B.KehaiReadCap : 100, c.kehai.k + n);
    c.kehai.sinceRise = 0;
  }
  function setKehai(v, hold = false) {
    c.kehai.k = v;
    c.kehai.sinceRise = 0;
    c.hold = hold;
  }
  // 演出用：手燭を細らせ、影を落とさない（驚かせ3）。最後は blowOut で消す
  function setScene(mul, noShadow) {
    c.sceneMul = mul;
    c.noShadow = noShadow;
  }
  // 手紙を読んだあと：手の動きなしに、誰かの息で火が倒れて消える。以後は点かない（GDD 変更 2026-11-17）
  function douse() {
    c.locked = true;
    if (!c.lit && c.mode !== 'light') return;
    c.lit = false;
    c.mode = 'blow';
    c.gust = true;
    c.modeT = B.BlowLiftTime; // 持ち上げずに、その場で消える
    match.visible = false;
  }
  function blowOut() {
    if (!c.lit && c.mode !== 'light') return;
    c.lit = false;
    c.mode = 'blow';
    c.modeT = 0;
  }

  // 帳場で手燭を手に入れた（火は行灯から移してある）
  function equip() {
    relight();
  }

  function setSafeHere() {
    Object.assign(c.safe, { has: true, x: player.pos.x, z: player.pos.z, yaw: player.yaw, level: player.level });
  }

  return {
    toggle,
    update,
    wantsShadow,
    driveShadowLight,
    wantsLight,
    setLight,
    releaseShadow,
    tooDark,
    addKehai,
    setKehai,
    equip,
    setScene,
    blowOut,
    douse,
    // 火なしで暗がりにいる（湯の底の札が光る）／炎が十分に明るい（湯面に火が映る）
    groping: () => c.dark.dark && c.level < 0.05,
    flameUp: () => c.level >= 0.5,
    setSafeHere,
    get busy() { return c.busy; },
    // ハーネス・調整用
    api: {
      lit: () => c.lit,
      toggle,
      kehai: () => c.kehai.k,
      setKehai,
      hold: () => c.hold,
      locked: () => !!c.locked,
      near: () => ({ near: c.near, target: c.nearTarget, wall: wallDist(), pos: flamePos().toArray() }),
      stage: () => c.stage,
      dark: () => c.dark.dark,
      caught: () => c.caught,
      busy: () => c.busy,
      okamiOn: () => c.okamiOn,
      okamiPos: () => okami.position.toArray(),
      candlePos: () => flamePos().toArray(),
      shadowUpdates: () => c.shadowUpdates,
      safe: () => ({ ...c.safe }),
      // 女将の人形が色を書かない（姿が映らない）か
      // 調整用：女将を (x, z) に立たせる／手燭の明るさを変える
      debugPlace: (x, z) => {
        okami.position.set(x, player.floorAt(x, z), z);
        faceOkami();
        c.okamiOn = true;
      },
      debugIntensity: (m) => (c.debugMul = m),
      okamiHidden: () => {
        let shown = false;
        okami.traverse((o) => o.isMesh && o.material.colorWrite !== false && (shown = true));
        return !shown;
      },
    },
  };
}
