// 宿じゅうの暗がりと、消して見る謎（マイルストーン2）の確かめ。ふつうに一周目を始める
//   node harness/run.mjs ushimitsu-no-ryokan darkness
export default async function (h) {
  const results = {};
  const check = (name, ok, detail) => {
    results[name] = ok ? 'ok' : `NG ${detail ?? ''}`;
    if (!ok) throw new Error(`${name}: ${detail ?? ''}`);
  };
  const C = (fn, arg) => h.game((g, a) => (0, eval)(`(${a.src})`)(g.candle, a.arg), { src: fn.toString(), arg });
  const msg = () => h.page.evaluate(() => document.getElementById('msgText')?.textContent || '');
  // 当たり判定の箱の、ワールドでの位置
  const hitPos = (id) => h.game((g, id) => {
    let p = null;
    window.__inn.G.scene.traverse((o) => {
      if (o.userData?.id === id) p = o.getWorldPosition(o.position.clone()).toArray();
    });
    return p;
  }, id);
  // 照準が合ったらすぐ調べ、最初の行を読む（文章は閉じない）
  const read = async (id, ...v) => {
    await h.use(id, ...v);
    await h.game((g) => g.act()); // 浮かび上がりを終わらせる
    return msg();
  };
  const darkAt = async (x, z, tx, ty, tz, level = 0) => {
    await h.look(x, z, tx, ty, tz, level);
    await h.waitGame(1300);
    return C((c) => c.dark());
  };

  await h.open('');
  await h.start();

  // 手燭は最初は持っておらず、帳場の行灯の傍らで手に入れる
  const s0 = await h.game((g) => ({ has: g.state.hasCandle, lit: g.candle.lit() }));
  check('最初は手燭を持っていない', !s0.has && !s0.lit, JSON.stringify(s0));
  await h.game((g) => Object.assign(g.state, { hasKey: true, doorOpen: true, doorAnim: 1, hasTsubaki: true }));
  await h.use('teshoku', 0.7, 4.4, 0.7, 0.66, 5.38);
  await h.close();
  const s1 = await h.game((g) => ({ has: g.state.hasCandle, lit: g.candle.lit() }));
  check('帳場で手燭を手に入れると火が点いている', s1.has && s1.lit, JSON.stringify(s1));
  await h.waitGame(500);
  await C((c) => c.setKehai(0));

  // M2-1 暗がりの場所が決まりどおり
  const where = {
    渡り廊下: await darkAt(12.0, 2.7, 16.0, 1.5, 2.7),
    脱衣所: await darkAt(19.5, 2.5, 21.0, 1.2, 2.5),
    露天: await darkAt(19.0, -0.3, 22.2, 0.1, -3.6),
    二階の廊下: await darkAt(-5.8, 4.0, -5.8, 4.2, 8.0, 1),
    松の間: await darkAt(-8.07, 3.92, -9.0, 3.6, 3.92, 1),
    中庭の奥: await darkAt(12.0, -5.0, 15.5, -0.5, -1.6),
    椿の間: await darkAt(0.6, 0.9, -0.6, 0.9, -2.2),
    帳場: await darkAt(-1.2, 4.3, -2.38, 1.45, 4.3),
    大広間: await darkAt(14.32, 6.0, 14.32, 1.1, 10.8),
    石灯籠のそば: await darkAt(15.5, -0.3, 15.5, -0.4, -1.6),
  };
  const want = { 渡り廊下: true, 脱衣所: true, 露天: true, 二階の廊下: true, 松の間: true, 中庭の奥: true, 椿の間: false, 帳場: false, 大広間: false, 石灯籠のそば: false };
  const wrong = Object.keys(want).filter((k) => where[k] !== want[k]);
  check('暗がりの場所が決まりどおり', !wrong.length, JSON.stringify(where));
  await C((c) => c.setKehai(0));

  // M2-2 暗がりで火がないと読めない（二階の松の間の書き置き）
  const note = await hitPos('matsuNote');
  check('松の間の書き置きがある', !!note);
  const at = [-8.07, 3.92, note[0], note[1], note[2], 1];
  await h.look(...at);
  await h.waitGame(1300);
  await C((c) => c.toggle());
  await h.waitGame(1000);
  const dim = await read('matsuNote', ...at);
  await h.close();
  check('暗がりで火がないと読めない', dim === '暗くて、字が読めない。', dim);
  await C((c) => c.toggle());
  await h.waitGame(1400);
  const lit = await read('matsuNote', ...at);
  await h.close();
  check('火を点けると読める', lit.startsWith('松の間の書き置き'), lit);
  await C((c) => c.setKehai(0));

  // M2-3 湯の底は火を消すと取れる
  await h.game((g) => Object.assign(g.state, { yudonoOpen: true, yudonoAnim: 1 }));
  const bath = [18.85, -2.3, 19.75, -0.3, -2.35];
  const g1 = await read('bathCard', ...bath);
  await h.close();
  const g2 = await read('bathCard', ...bath);
  await h.close();
  const glowLit = await h.game(() => window.__inn.W.bath.card.material[2].emissiveIntensity);
  check('火を点けていると湯面に火が映る', g1 === '湯面に手燭の火が映って、底が見えない。' && g2.startsWith('湯面に、自分の手燭') && !(await h.game((g) => g.state.hasShobu)), JSON.stringify({ g1, g2 }));
  await C((c) => c.toggle());
  await h.waitGame(1200);
  const glowDark = await h.game(() => window.__inn.W.bath.card.material[2].emissiveIntensity);
  await h.look(...bath);
  await h.waitGame(300);
  await h.shot('bath-dark', { clean: true });
  const g3 = await read('bathCard', ...bath);
  await h.close();
  check('湯の底は火を消すと光って取れる', glowLit === 0 && glowDark > 1 && g3.startsWith('暗い湯の底') && (await h.game((g) => g.state.hasShobu)), JSON.stringify({ glowLit, glowDark, g3 }));
  await C((c) => c.toggle());
  await h.waitGame(1400);
  await C((c) => c.setKehai(0));

  // M2-4 驚かせ2のあと気配40から。桔梗の間（明るい）では引かず、暗い廊下に出ると段階1になる
  await h.game((g) => Object.assign(g.state, { hasKey: true, doorOpen: true, doorAnim: 1, hasTsubaki: true, kikyoOpen: true, kikyoAnim: 1 }));
  await h.use('kikyoDesk', 9.3, 0.6, 9.3, 0.3, -0.65);
  await h.close();
  await h.until((g) => g.phase() === 'play' && g.state.lanternsOut, { timeout: 180000, label: '驚かせ2が明ける' });
  const k0 = await C((c) => ({ k: c.kehai(), hold: c.hold() }));
  await h.waitGame(3000);
  const k1 = await C((c) => ({ k: c.kehai(), stage: c.stage() }));
  check('驚かせ2のあと気配40から', k0.k === 40 && k0.hold && k1.k === 40 && k1.stage === 0, JSON.stringify({ k0, k1 }));
  await h.look(6.5, 2.7, 9.5, 1.5, 2.7);
  await h.waitGame(1200);
  const k2 = await C((c) => ({ k: c.kehai(), stage: c.stage(), hold: c.hold(), dark: c.dark() }));
  check('廊下に出ると段階1になる', k2.dark && !k2.hold && k2.stage === 1 && k2.k >= 40, JSON.stringify(k2));
  await C((c) => c.setKehai(0));
  await h.waitGame(600);

  // M2-4 花札錠の罰で気配が増える。画面のあいだは見つからない
  await h.use('lock', 9.3, 6.6, 9.45, 1.0, 7.3);
  await h.until((g) => g.ui.modal === 'lock', { timeout: 30000 });
  const kb = await C((c) => c.kehai());
  for (let i = 0; i < 3; i++) {
    await h.game((g) => {
      const o = g.state.lockOrder;
      g.ui._lock.slots = [o[1], o[0], o[2]]; // わざと間違える
      g.ui.lockTry();
    });
    await h.waitGame(300);
  }
  await h.waitGame(2500);
  const kp = await C((c) => c.kehai());
  check('花札錠の罰で気配が増える', Math.abs(kp - kb - 36) < 0.01, `${kb} → ${kp}`);
  await C((c) => c.setKehai(99));
  await h.game((g) => {
    const o = g.state.lockOrder;
    g.ui._lock.slots = [o[1], o[0], o[2]];
    g.ui.lockTry();
  });
  await h.waitGame(2000);
  const kc = await C((c) => ({ k: c.kehai(), caught: c.caught(), busy: c.busy() }));
  check('錠の画面のあいだは見つからない', kc.k <= 90 && kc.caught === 0 && !kc.busy, JSON.stringify(kc));
  await h.game((g) => g.ui.lockClose());
  return results;
}
