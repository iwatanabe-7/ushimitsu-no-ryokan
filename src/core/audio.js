// Web Audio で音をすべて合成する。ヘッドホン前提で、音源は 3D 定位させる。
export class InnAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
  }

  start() {
    if (this.ctx) {
      this.ctx.resume?.();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // 室内の響き（短いリバーブ）
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(1.6, 2.8);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.35;
    this.reverb.connect(this.reverbGain).connect(this.master);
    this.noiseBuf = this.makeNoise(2);
    this.startWind();
    this.ready = true;
  }

  makeNoise(sec) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  impulse(sec, decay) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * sec;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  panner(pos) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 0.6;
    p.rolloffFactor = 1.2;
    if (p.positionX) {
      p.positionX.value = pos.x;
      p.positionY.value = pos.y;
      p.positionZ.value = pos.z;
    } else p.setPosition(pos.x, pos.y, pos.z);
    p.connect(this.master);
    const send = this.ctx.createGain();
    send.gain.value = 0.6;
    p.connect(send).connect(this.reverb);
    return p;
  }

  updateListener(camera) {
    if (!this.ready) return;
    const l = this.ctx.listener;
    const p = camera.position;
    const f = camera.getWorldDirection(this._dir || (this._dir = camera.position.clone()));
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.02);
      l.positionY.setTargetAtTime(p.y, t, 0.02);
      l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(f.x, t, 0.02);
      l.forwardY.setTargetAtTime(f.y, t, 0.02);
      l.forwardZ.setTargetAtTime(f.z, t, 0.02);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }

  noiseSource() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    s.loopStart = Math.random();
    return s;
  }

  // 風：戸外から聞こえるように障子側へ定位
  startWind() {
    const ctx = this.ctx;
    const out = this.panner({ x: -4, y: 1.5, z: 0 });
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 380;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.09;
    lfo.connect(lfoGain).connect(g.gain);
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.13;
    const lfo2g = ctx.createGain();
    lfo2g.gain.value = 160;
    lfo2.connect(lfo2g).connect(bp.frequency);
    src.connect(bp).connect(g).connect(out);
    src.start();
    lfo.start();
    lfo2.start();
    // 低いうなり
    const src2 = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 120;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    src2.connect(lp).connect(g2).connect(this.master);
    src2.start();
  }

  burst(pos, { type = 'bandpass', freq = 1000, q = 1, dur = 0.08, gain = 0.5, attack = 0.002, when = 0, dry = false } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g);
    g.connect(pos ? this.panner(pos) : this.master);
    if (dry === false && !pos) g.connect(this.reverb);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
    return f;
  }

  tick(pos, tock) {
    this.burst(pos, { type: 'highpass', freq: tock ? 2600 : 3400, q: 0.8, dur: 0.035, gain: 0.35 });
    this.tone(pos, tock ? 1650 : 1900, 0.03, 0.05);
  }

  tone(pos, freq, dur, gain, type = 'sine', when = 0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(pos ? this.panner(pos) : this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // 畳を踏む音（すり足）
  stepTatami() {
    this.burst(null, { type: 'lowpass', freq: 700 + Math.random() * 200, q: 0.5, dur: 0.16, gain: 0.12, attack: 0.03 });
  }

  // 板張りを踏む音
  stepWood(pos, gain = 0.5) {
    this.burst(pos, { type: 'bandpass', freq: 220 + Math.random() * 60, q: 2.5, dur: 0.18, gain });
    this.burst(pos, { type: 'bandpass', freq: 900, q: 3, dur: 0.06, gain: gain * 0.3 });
    if (Math.random() < 0.3) this.creak(pos, gain * 0.25, 0.35);
  }

  // きしみ
  creak(pos, gain = 0.25, dur = 0.7) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70 + Math.random() * 30, t);
    o.frequency.linearRampToValueAtTime(110 + Math.random() * 60, t + dur * 0.6);
    o.frequency.linearRampToValueAtTime(85, t + dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.08);
    // 不規則な摩擦のゆらぎ
    for (let k = 0.1; k < dur; k += 0.04) g.gain.setValueAtTime(gain * (0.4 + Math.random() * 0.6), t + k);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(g).connect(pos ? this.panner(pos) : this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // 襖を滑らせる音
  slide(pos, dur = 0.9, gain = 0.35) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.linearRampToValueAtTime(1300, t + dur);
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.1);
    g.gain.setValueAtTime(gain * 0.8, t + dur - 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(pos ? this.panner(pos) : this.master);
    src.start(t);
    src.stop(t + dur + 0.1);
    // 戸当たり
    this.burst(pos, { type: 'bandpass', freq: 300, q: 2, dur: 0.12, gain: gain * 1.2, when: dur - 0.05 });
  }

  // 物を拾う：小さな木の音
  pickup() {
    this.burst(null, { type: 'bandpass', freq: 1800, q: 4, dur: 0.05, gain: 0.25 });
    this.tone(null, 520, 0.4, 0.05, 'triangle', 0.02);
  }

  // 鍵を回す
  unlock(pos) {
    this.burst(pos, { type: 'highpass', freq: 2500, q: 1, dur: 0.05, gain: 0.4 });
    this.burst(pos, { type: 'bandpass', freq: 1200, q: 5, dur: 0.08, gain: 0.5, when: 0.18 });
  }

  // 低く沈む持続音（異変のとき）
  drone(dur = 4, gain = 0.12) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const f of [55, 58.3]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = 0.9 * v;
  }

  // 柱時計の鐘
  bong(pos, gain = 0.5) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = pos ? this.panner(pos) : this.master;
    for (const [f, g, d] of [[196, 1, 4.5], [392.5, 0.5, 3], [589, 0.25, 2], [787, 0.15, 1.5], [246.9, 0.3, 3.5]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(0.0001, t);
      gg.gain.exponentialRampToValueAtTime(gain * g, t + 0.01);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gg).connect(out);
      o.start(t);
      o.stop(t + d + 0.1);
    }
    this.burst(pos, { type: 'bandpass', freq: 2200, q: 3, dur: 0.05, gain: gain * 0.6 });
  }

  // 息づかい（すぐ近くで）
  breath(pos, gain = 0.2) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.linearRampToValueAtTime(600, t + 1.4);
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    src.connect(bp).connect(g).connect(pos ? this.panner(pos) : this.master);
    src.start(t);
    src.stop(t + 1.6);
  }

  // 灯が消える音
  snuff(pos) {
    this.burst(pos, { type: 'lowpass', freq: 500, q: 0.5, dur: 0.35, gain: 0.25, attack: 0.02 });
  }

  // 女将の声。音声合成が使えない環境では字幕だけになる
  voice(text) {
    try {
      const ss = window.speechSynthesis;
      if (!ss) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.pitch = 0.55;
      u.rate = 0.72;
      u.volume = 0.55 * (this.volume ?? 1);
      const v = ss.getVoices().find((vv) => vv.lang && vv.lang.startsWith('ja'));
      if (v) u.voice = v;
      else return;
      ss.speak(u);
    } catch (_) { /* 音声合成なし */ }
  }
}
