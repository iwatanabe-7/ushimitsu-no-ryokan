// 直した不具合が戻っていないかを確かめる（game-studio/harness/run.mjs から使う）
//   node harness/run.mjs ushimitsu-no-ryokan regressions
export default async function (h) {
  const results = {};
  const check = (name, ok, detail) => {
    results[name] = ok ? 'ok' : `NG ${detail ?? ''}`;
    if (!ok) throw new Error(`${name}: ${detail ?? ''}`);
  };
  await h.start();
  const { page } = h;

  // 1. 設定のスライダーにフォーカスがあるときに Enter / Esc を押しても、記帳（エンディングB）にならない
  await page.focus('#setVolume');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await h.wait(300);
  const s1 = await h.game((g) => ({ phase: g.phase(), modal: g.ui.modal }));
  check('スライダーで Enter しても記帳しない', s1.phase === 'play' && s1.modal === null, JSON.stringify(s1));
  await page.evaluate(() => document.activeElement?.blur());

  // 2. 鏡台：文章を連打しても驚かせは一度だけ。人影が消えるまで鏡台は調べられない
  await h.game((g) => Object.assign(g.state, { hasKey: true, doorOpen: true, doorAnim: 1, shobuOpen: true, shobuAnim: 1 }));
  await h.use('mirror', 3.5, 0.5, 3.45, 1.15, -0.7);
  await h.close();
  await h.look(3.5, 0.5, 3.45, 1.15, -0.7);
  const f2 = await h.game((g) => g.focus());
  check('驚かせの最中は鏡台を調べられない', f2 !== 'mirror', `focus=${f2}`);
  await h.until((g) => g.ui.talking, { timeout: 60000, label: '鏡のあとの文章' });
  await h.close();

  // 3. 一時停止中は演出のタイマーが進まない（大広間の拍手のあとの文章が、メニューの裏に出ない）
  await h.game((g) => Object.assign(g.state, { hiromaOpen: true, hiromaAnim: 1 }));
  await h.use('kamiza', 14.32, 8.1, 14.32, 0.2, 8.95);
  await h.close(); // 鍵を手に入れた文章 → 閉じると拍手が始まる
  await h.game((g) => (g.state.paused = true));
  const c0 = await h.game((g) => g.clock());
  await h.wait(6000);
  const s3 = await h.game((g) => ({ talking: g.ui.talking, clock: g.clock() }));
  check('一時停止中はゲーム内時間が止まる', s3.clock === c0, `clock ${c0} → ${s3.clock}`);
  check('一時停止中に文章が出ない', !s3.talking);
  await h.game((g) => (g.state.paused = false));
  await h.until((g) => g.ui.talking, { timeout: 120000, label: '再開後に拍手の文章が出る' });
  check('再開すると演出が続く', true);
  await h.close();

  // 4. 画質を何度切り替えても、GPU の資源（描画先・テクスチャ）が増え続けない
  const tex = async () => h.game((g) => (g.render(), g.renderer.info.memory.textures));
  const setQ = (q) => page.evaluate((q) => { const el = document.getElementById('setQuality'); el.value = q; el.dispatchEvent(new Event('change')); }, q);
  await setQ('high');
  const t0 = await tex();
  for (const q of ['medium', 'low', 'high', 'medium', 'low', 'high']) await setQ(q);
  const t1 = await tex();
  check('画質の切り替えでテクスチャが増え続けない', t1 <= t0 + 2, `${t0} → ${t1}`);

  return results;
}
