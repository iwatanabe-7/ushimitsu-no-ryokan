// 移動・視点・当たり判定（設計書の PlayerController に相当。操作は前作と同じ）
import * as THREE from 'three';
import { EYE } from '../world/layout.js';

const inRect = (x, z, [x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1;

export class Player {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.pos = new THREE.Vector3(0.3, EYE, -0.45);
    this.yaw = Math.PI + 0.35;
    this.pitch = 0;
    this.floorY = 0;
    this.keys = {};
    this.sensitivity = 1;
    this.locked = false;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.touchMove = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.touchLook = { id: null, x: 0, y: 0 };
    this.stepAcc = 0;
    this.stillTime = 0;
    this.echoArmed = false;
    this.lookEnabled = false;
    this.bindInput();
  }

  bindInput() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
    window.addEventListener('blur', () => Object.keys(this.keys).forEach((k) => (this.keys[k] = false)));
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === c;
      this.onLockChange?.(this.locked);
    });
    let dragging = false;
    c.addEventListener('mousedown', () => {
      if (!this.lookEnabled) return;
      if (!this.locked) this.requestLock();
      dragging = true;
    });
    window.addEventListener('mouseup', () => (dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (!this.lookEnabled) return;
      if (!this.locked && !dragging) return;
      const s = 0.0022 * this.sensitivity;
      this.yaw -= e.movementX * s;
      this.pitch = Math.max(-1.22, Math.min(1.22, this.pitch - e.movementY * s));
    });
    if (this.isTouch) this.bindTouch();
  }

  bindTouch() {
    const c = this.canvas;
    const stick = document.getElementById('stick');
    const TM = this.touchMove, TL = this.touchLook;
    c.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth / 2 && TM.id === null) {
          Object.assign(TM, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: 0, y: 0 });
          stick.style.left = t.clientX + 'px';
          stick.style.top = t.clientY + 'px';
          stick.hidden = false;
        } else if (TL.id === null) Object.assign(TL, { id: t.identifier, x: t.clientX, y: t.clientY });
      }
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === TM.id) {
          const dx = t.clientX - TM.ox, dy = t.clientY - TM.oy;
          const l = Math.min(1, Math.hypot(dx, dy) / 50);
          const a = Math.atan2(dy, dx);
          TM.x = Math.cos(a) * l;
          TM.y = Math.sin(a) * l;
          stick.firstElementChild.style.transform = `translate(${TM.x * 28}px, ${TM.y * 28}px)`;
        } else if (t.identifier === TL.id && this.lookEnabled) {
          this.yaw -= (t.clientX - TL.x) * 0.006 * this.sensitivity;
          this.pitch = Math.max(-1.22, Math.min(1.22, this.pitch - (t.clientY - TL.y) * 0.006 * this.sensitivity));
          TL.x = t.clientX;
          TL.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === TM.id) {
          TM.id = null;
          TM.x = TM.y = 0;
          stick.hidden = true;
          stick.firstElementChild.style.transform = '';
        }
        if (t.identifier === TL.id) TL.id = null;
      }
    };
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);
  }

  requestLock() {
    if (this.isTouch) return;
    try {
      this.canvas.requestPointerLock?.()?.catch?.(() => {});
    } catch (_) { /* ポインタロックできない環境ではドラッグで視点操作 */ }
  }

  walkable(x, z) {
    const { walk, block } = this.ctx;
    for (const b of block) {
      if (b.r && inRect(x, z, b.r)) return false;
      if (b.c && Math.hypot(x - b.c[0], z - b.c[1]) < b.c[2]) return false;
    }
    return walk.some((w) => (!w.when || w.when()) && inRect(x, z, w.r));
  }

  floorAt(x, z) {
    for (const f of this.ctx.floors) if (inRect(x, z, f.r)) return f.y;
    return 0;
  }

  // gate(x, z) が false を返す場所には進まない（物語上の通せんぼ）
  update(dt, gate) {
    const k = this.keys;
    let f = 0, s = 0;
    if (k.KeyW || k.ArrowUp) f += 1;
    if (k.KeyS || k.ArrowDown) f -= 1;
    if (k.KeyA || k.ArrowLeft) s -= 1;
    if (k.KeyD || k.ArrowRight) s += 1;
    f -= this.touchMove.y;
    s += this.touchMove.x;
    const len = Math.hypot(f, s);
    if (len > 1) {
      f /= len;
      s /= len;
    }
    const speed = k.ShiftLeft || k.ShiftRight ? 2.3 : 1.7;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = (-sin * f + cos * s) * speed * dt;
    const dz = (-cos * f - sin * s) * speed * dt;
    const p = this.pos;
    const bx = p.x, bz = p.z;
    if (this.walkable(p.x + dx, p.z) && gate(p.x + dx, p.z)) p.x += dx;
    if (this.walkable(p.x, p.z + dz) && gate(p.x, p.z + dz)) p.z += dz;
    const moved = Math.hypot(p.x - bx, p.z - bz);
    // 段差（玄関の土間）はゆっくり下りる
    const target = this.floorAt(p.x, p.z);
    this.floorY += (target - this.floorY) * Math.min(1, dt * 8);
    return moved;
  }
}
