import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE as B } from '../src/game/balance.js';
import { stepKehai, stageOf, shouldCatch, stepDark, kehaiMul } from '../src/game/kehai.js';

const base = { dark: true, lit: true, awake: true, moving: true, reading: false, modal: false, lap2: false, caughtCount: 0 };
const fresh = () => ({ k: 0, sinceRise: 0, grace: 0 });
const DT = 1 / 60;
// 100 になるまでの秒数
function timeTo100(input) {
  const s = fresh();
  let t = 0;
  while (s.k < 100 && t < 120) {
    stepKehai(s, input, DT, B);
    t += DT;
  }
  return t;
}

test('kehai: 暗がりで火を点けて歩くと約17秒で100になる', () => {
  const t = timeTo100(base);
  assert.ok(t >= 16 && t <= 18, `${t}`);
});

test('kehai: 立ち止まると約29秒', () => {
  const t = timeTo100({ ...base, moving: false });
  assert.ok(t >= 28 && t <= 30, `${t}`);
});

test('kehai: 明るい所では溜まらない', () => {
  const s = fresh();
  for (let i = 0; i < 600; i++) stepKehai(s, { ...base, dark: false }, DT, B);
  assert.equal(s.k, 0);
});

test('kehai: 火を消すと1.5秒は引かず、そのあと12/秒で引く', () => {
  const s = { k: 60, sinceRise: 0, grace: 0 };
  const off = { ...base, lit: false };
  for (let i = 0; i < 84; i++) stepKehai(s, off, DT, B); // 1.4秒
  assert.equal(s.k, 60);
  for (let i = 0; i < 66; i++) stepKehai(s, off, DT, B); // 合計 2.5秒
  assert.ok(Math.abs(s.k - (60 - 12 * 1.0)) < 0.5, `${s.k}`);
});

test('kehai: 文章を読んでいるあいだは90で止まり、見つからない', () => {
  const s = { k: 85, sinceRise: 0, grace: 0 };
  const reading = { ...base, reading: true };
  for (let i = 0; i < 600; i++) stepKehai(s, reading, DT, B);
  assert.equal(s.k, 90);
  assert.equal(shouldCatch(s, reading), false);
});

test('kehai: 閉じてから1秒は見つからない', () => {
  const s = { k: 100, sinceRise: 0, grace: 0 };
  stepKehai(s, { ...base, reading: true }, DT, B);
  s.k = 100;
  for (let i = 0; i < 54; i++) stepKehai(s, base, DT, B); // 0.9秒
  assert.equal(shouldCatch(s, base), false);
  for (let i = 0; i < 12; i++) stepKehai(s, base, DT, B); // 1.1秒
  assert.equal(shouldCatch(s, base), true);
});

test('kehai: 段階は35と70で上がり、27と62を下回るまで下がらない', () => {
  assert.equal(stageOf(34, 0, B), 0);
  assert.equal(stageOf(35, 0, B), 1);
  assert.equal(stageOf(70, 1, B), 2);
  assert.equal(stageOf(63, 2, B), 2);
  assert.equal(stageOf(61, 2, B), 1);
  assert.equal(stageOf(28, 1, B), 1);
  assert.equal(stageOf(26, 1, B), 0);
  assert.equal(stageOf(20, 2, B), 0);
});

test('kehai: 見つかった回数で溜まり方が0.8倍ずつ下がり、0.6倍で止まる', () => {
  assert.equal(kehaiMul({ caughtCount: 0 }, B), 1);
  assert.ok(Math.abs(kehaiMul({ caughtCount: 1 }, B) - 0.8) < 1e-9);
  assert.ok(Math.abs(kehaiMul({ caughtCount: 2 }, B) - 0.64) < 1e-9);
  assert.equal(kehaiMul({ caughtCount: 3 }, B), 0.6);
  assert.equal(kehaiMul({ caughtCount: 10 }, B), 0.6);
  assert.ok(Math.abs(kehaiMul({ caughtCount: 0, lap2: true }, B) - 1.25) < 1e-9);
});

test('dark: 境目を0.5秒以内に行き来しても切り替わらない', () => {
  const s = { dark: false, t: 0 };
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 24; j++) stepDark(s, true, DT, B); // 0.4秒
    stepDark(s, false, DT, B);
  }
  assert.equal(s.dark, false);
  for (let j = 0; j < 31; j++) stepDark(s, true, DT, B);
  assert.equal(s.dark, true);
});

test('kehai: 場所の倍率 1.5 では約11秒で100になる（菖蒲の間のまわり）', () => {
  const t = timeTo100({ ...base, mul: B.ShobuHotMul });
  assert.ok(t >= 10.5 && t <= 12, `${t}`);
});

test('kehai: 花札錠の画面のあいだは明るくても引かず、閉じると引き始める', () => {
  const s = { k: 36, sinceRise: 0, grace: 0 };
  const lockOpen = { ...base, dark: false, modal: true };
  for (let i = 0; i < 300; i++) stepKehai(s, lockOpen, DT, B);
  assert.equal(s.k, 36);
  const closed = { ...base, dark: false };
  for (let i = 0; i < 180; i++) stepKehai(s, closed, DT, B);
  assert.ok(s.k < 36, `${s.k}`);
});
