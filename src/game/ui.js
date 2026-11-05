// 画面上のUI：文章（MessageUI）、持ち物、宿帳（LedgerUI）、花札錠（HanafudaLock の画面）、一時停止、終幕
import { hanafudaCanvas } from '../core/textures.js';

const $ = (id) => document.getElementById(id);
const CARD_NAME = { tsubaki: '椿', shobu: '菖蒲', kikyo: '桔梗' };

export class UI {
  constructor() {
    this.el = {
      msg: $('msg'), msgText: $('msgText'), prompt: $('prompt'), promptLabel: $('promptLabel'),
      reticle: $('reticle'), inv: $('inv'), ledger: $('ledger'), ledgerRows: $('ledgerRows'),
      ledgerActions: $('ledgerActions'), ledgerNameRow: $('ledgerNameRow'), ledgerName: $('ledgerName'),
      ledgerCaption: $('ledgerCaption'), lock: $('lock'), lockSlots: $('lockSlots'), pause: $('pause'),
      end: $('end'), subtitle: $('subtitle'),
    };
    this.queue = [];
    this.done = null;
    this.typing = null;
    this.modal = null; // 'ledger' | 'lock' | null
    this.el.msg.addEventListener('click', () => this.talking && this.next());
  }

  get talking() {
    return !this.el.msg.hidden;
  }

  // 会話で動きが止まる場面は、導入のように上下に黒い帯を入れ、文字を一行ずつ浮かべる
  say(lines, done) {
    this.queue = [...lines];
    this.done = done || null;
    this.el.msg.hidden = false;
    this.el.msg.classList.remove('caption');
    document.body.classList.add('talk');
    this.next();
  }

  next() {
    if (this.locked) return;
    const t = this.el.msgText;
    if (this.typing) {
      // 浮かび上がる途中なら、すぐに表示しきる
      clearTimeout(this.typing.id);
      t.classList.add('now', 'in');
      this.typing = null;
      return;
    }
    if (!this.queue.length) {
      this.el.msg.hidden = true;
      document.body.classList.remove('talk');
      t.classList.remove('in');
      const d = this.done;
      this.done = null;
      d && d();
      return;
    }
    const full = this.queue.shift();
    t.classList.remove('in', 'now');
    t.textContent = full;
    void t.offsetWidth;
    t.classList.add('in');
    this.typing = { id: setTimeout(() => (this.typing = null), 550), full };
  }

  // 演出の場面：操作を止めて黒い帯を出す。caption で帯の中に一行ずつ浮かべる（E では送れない）
  cinema(on) {
    this.locked = on;
    document.body.classList.toggle('movie', on);
    if (!on) {
      this.el.msg.hidden = true;
      this.el.msgText.classList.remove('in');
    }
  }

  caption(text) {
    const t = this.el.msgText;
    this.el.msg.hidden = false;
    this.el.msg.classList.add('caption');
    t.classList.remove('in', 'now');
    t.textContent = text;
    void t.offsetWidth;
    t.classList.add('in');
  }

  // 字幕（声など、送り操作のいらない一行）
  subtitle(text, ms = 2600) {
    const s = this.el.subtitle;
    s.textContent = text;
    s.hidden = false;
    clearTimeout(this._sub);
    this._sub = setTimeout(() => (s.hidden = true), ms);
  }

  setPrompt(label) {
    this.el.prompt.hidden = !label;
    this.el.reticle.classList.toggle('on', !!label);
    if (label) this.el.promptLabel.textContent = label;
  }

  addItem(id, name, draw) {
    const el = document.createElement('div');
    el.className = 'item';
    el.dataset.id = id;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 96;
    draw(c.getContext('2d'));
    const label = document.createElement('span');
    label.textContent = name;
    el.append(c, label);
    this.el.inv.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
  }

  removeItem(id) {
    this.el.inv.querySelector(`[data-id="${id}"]`)?.remove();
  }

  // ---------------------------------------------------------- 宿帳
  showLedger(rows, { canSign = false, caption = '', onSign, onClose } = {}) {
    this.modal = 'ledger';
    const box = this.el.ledgerRows;
    box.textContent = '';
    for (const r of rows) {
      const col = document.createElement('div');
      col.className = 'row' + (r.faded ? ' faded' : '') + (r.blank ? ' blank' : '') + (r.fresh ? ' fresh' : '');
      const date = document.createElement('span');
      date.className = 'date';
      date.textContent = r.date;
      const room = document.createElement('span');
      room.className = 'room';
      room.textContent = r.room;
      const mark = document.createElement('span');
      mark.className = 'mark';
      if (r.mark) {
        mark.dataset.mark = r.mark;
        mark.title = CARD_NAME[r.mark] + 'の印';
        mark.textContent = CARD_NAME[r.mark][0];
      }
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = r.name || '　';
      col.append(date, room, mark, name);
      box.append(col);
    }
    this.el.ledgerActions.hidden = !canSign && !onClose;
    $('ledgerSign').hidden = !canSign;
    this.el.ledgerNameRow.hidden = true;
    this.el.ledgerCaption.textContent = caption;
    this.el.ledgerCaption.hidden = !caption;
    this.el.ledger.hidden = false;
    this._ledger = { onSign, onClose };
    $('ledgerClose').hidden = !onClose;
    if (onClose) $('ledgerClose').focus({ preventScroll: true });
  }

  ledgerAskName() {
    this.el.ledgerActions.hidden = true;
    this.el.ledgerNameRow.hidden = false;
    this.el.ledgerName.value = '';
    this.el.ledgerName.focus();
  }

  hideLedger() {
    this.el.ledger.hidden = true;
    this.modal = null;
  }

  // ---------------------------------------------------------- 花札錠
  showLock(owned, { onTry, onClose }) {
    this.modal = 'lock';
    this._lock = { owned, slots: [null, null, null], sel: 0, onTry, onClose };
    this.renderLock();
    this.el.lock.hidden = false;
  }

  renderLock() {
    const L = this._lock;
    const box = this.el.lockSlots;
    box.textContent = '';
    L.slots.forEach((kind, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot' + (i === L.sel ? ' sel' : '');
      b.setAttribute('aria-label', `${i + 1}番目の札入れ：${kind ? CARD_NAME[kind] : '空'}`);
      if (kind) {
        const img = document.createElement('canvas');
        img.width = 160;
        img.height = 256;
        img.getContext('2d').drawImage(hanafudaCanvas(kind), 0, 0);
        b.append(img);
      } else {
        const e = document.createElement('span');
        e.textContent = '空';
        b.append(e);
      }
      const n = document.createElement('small');
      n.textContent = ['一', '二', '三'][i];
      b.append(n);
      b.addEventListener('click', () => {
        L.sel = i;
        this.lockCycle(1);
      });
      box.append(b);
    });
  }

  lockCycle(dir) {
    const L = this._lock;
    const options = [null, ...L.owned];
    let idx = options.indexOf(L.slots[L.sel]);
    for (let k = 0; k < options.length; k++) {
      idx = (idx + dir + options.length) % options.length;
      const cand = options[idx];
      if (cand === null || !L.slots.some((s, j) => j !== L.sel && s === cand)) break;
    }
    L.slots[L.sel] = options[idx];
    this.renderLock();
  }

  lockKey(code) {
    const L = this._lock;
    if (code === 'ArrowLeft' || code === 'KeyA') L.sel = (L.sel + 2) % 3;
    else if (code === 'ArrowRight' || code === 'KeyD') L.sel = (L.sel + 1) % 3;
    else if (code === 'ArrowUp' || code === 'KeyW') return this.lockCycle(1);
    else if (code === 'ArrowDown' || code === 'KeyS') return this.lockCycle(-1);
    else if (code === 'Enter' || code === 'KeyE') return this.lockTry();
    else if (code === 'Escape') return this.lockClose();
    else return;
    this.renderLock();
  }

  lockTry() {
    const L = this._lock;
    if (L.slots.some((s) => !s)) {
      this.el.lock.classList.remove('shake');
      void this.el.lock.offsetWidth;
      this.el.lock.classList.add('shake');
      return;
    }
    const ok = L.onTry([...L.slots]);
    if (!ok) {
      L.slots = [null, null, null];
      this.renderLock();
      this.el.lock.classList.remove('shake');
      void this.el.lock.offsetWidth;
      this.el.lock.classList.add('shake');
    }
  }

  lockClose() {
    this.el.lock.hidden = true;
    this.modal = null;
    this._lock?.onClose?.();
  }

  hideLock() {
    this.el.lock.hidden = true;
    this.modal = null;
  }
}

export function drawCardIcon(kind) {
  return (x) => x.drawImage(hanafudaCanvas(kind), 4, 2, 56, 90);
}

export function drawKeyIcon(x) {
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

export function drawLetterIcon(x) {
  x.fillStyle = '#e8e0cc';
  x.fillRect(12, 14, 40, 68);
  x.fillStyle = '#3a2a1a';
  x.font = '600 11px serif';
  x.textAlign = 'center';
  ['お', '母', 'さ', 'ん', 'へ'].forEach((c, i) => x.fillText(c, 32, 30 + i * 11));
}
