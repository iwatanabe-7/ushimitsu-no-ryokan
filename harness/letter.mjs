// 二周目：娘の手紙を便箋の画面で読む → 閉じると手に入り、宿じゅうの火と手燭が消えて点かない → R で読み返せる
//   node harness/run.mjs ushimitsu-no-ryokan letter
export default async function (h) {
  const results = {};
  const check = (name, ok, detail) => {
    results[name] = ok ? 'ok' : `NG ${detail ?? ''}`;
    if (!ok) throw new Error(`${name}: ${detail ?? ''}`);
  };
  await h.open('');
  await h.page.evaluate(() => localStorage.setItem('ushimitsu-no-yado/v1', JSON.stringify({ clearCount: 1, seen: { A: true } })));
  await h.open('');
  await h.start();
  await h.game((g) => { g.candle.give(); Object.assign(g.state, { hasKey: true, doorOpen: true, doorAnim: 1, hasTsubaki: true, hasShobu: true, hasKikyo: true, kikyoOpen: true, kikyoAnim: 1 }); });
  await h.waitGame(1500);
  await h.use('kikyoDesk', 9.3, 0.6, 9.3, 0.3, -0.65);
  await h.close(); // 「文机の上に…」→ 便箋の画面
  const v = await h.page.evaluate(() => ({ modal: window.__game.ui.modal, shown: !document.getElementById('letterView').hidden, text: document.getElementById('letterBody').textContent }));
  check('手紙が便箋の画面で開く', v.modal === 'letter' && v.shown && v.text.includes('お母さんへ') && v.text.includes('この手紙を読んでいる、あなたへ') && !v.text.includes('……この手紙') && v.text.endsWith('千代'), JSON.stringify(v));
  await h.wait(1200);
  await h.page.screenshot({ path: 'shots/letter.png' }).catch(() => {});
  await h.shot('letter');
  check('読んでいるあいだは手紙をまだ持っていない', !(await h.game((g) => g.state.hasLetter)));
  await h.page.keyboard.press('KeyE');
  await h.close(); // 「娘の手紙」を手に入れた。
  await h.waitGame(1500);
  const a = await h.game((g) => ({ has: g.state.hasLetter, lit: g.candle.lit(), locked: g.candle.locked(), modal: g.ui.modal }));
  check('閉じると手に入り、手燭が消えて点かなくなる', a.has && !a.lit && a.locked && a.modal === null, JSON.stringify(a));
  await h.game((g) => g.candle.toggle());
  await h.waitGame(1500);
  check('火を点けようとしても点かない', !(await h.game((g) => g.candle.lit())));
  // 一つだけ灯る提灯の下（明るい廊下）で、R で読み返す
  await h.look(6.6, 2.75, 6.0, 1.5, 2.75);
  await h.waitGame(1500);
  await h.page.keyboard.press('KeyR');
  await h.wait(300);
  const r = await h.game((g) => ({ modal: g.ui.modal, talking: g.ui.talking }));
  check('R で読み返せる', r.modal === 'letter', JSON.stringify(r));
  await h.page.keyboard.press('Escape');
  await h.wait(300);
  check('Esc で閉じる', (await h.game((g) => g.ui.modal)) === null);
  check('読み返しても二度は手に入らない', (await h.page.evaluate(() => document.querySelectorAll('#inv [data-id="letter"]').length)) === 1);
  // 幅 390px でも便箋がはみ出さない
  await h.page.setViewportSize({ width: 390, height: 844 });
  await h.page.keyboard.press('KeyR');
  await h.wait(1200);
  const box = await h.page.evaluate(() => { const r = document.querySelector('.letter-paper').getBoundingClientRect(); return [r.left, r.right, innerWidth]; });
  await h.shot('letter-390');
  check('幅390pxで便箋がはみ出さない', box[0] >= 0 && box[1] <= box[2], JSON.stringify(box));

  // 手燭を持たずに読んだときは「手燭の火が消えた」を出さない
  await h.page.setViewportSize({ width: 1280, height: 720 });
  await h.open('');
  await h.start();
  await h.game((g) => Object.assign(g.state, { hasKey: true, doorOpen: true, doorAnim: 1, hasTsubaki: true, hasShobu: true, hasKikyo: true, kikyoOpen: true, kikyoAnim: 1 }));
  await h.waitGame(1500);
  await h.use('kikyoDesk', 9.3, 0.6, 9.3, 0.3, -0.65);
  await h.close();
  await h.game((g) => g.ui.closeLetter());
  await h.close();
  const subs = [];
  for (let i = 0; i < 12; i++) {
    const t = await h.page.evaluate(() => { const el = document.getElementById('subtitle'); return el.hidden ? '' : el.textContent; });
    if (t && !subs.includes(t)) subs.push(t);
    await h.wait(300);
  }
  check('手燭なしで読むと、火が消えた字幕は出ない', !subs.some((t) => t.includes('手燭の火が')) && (await h.game((g) => g.state.hasLetter)), JSON.stringify(subs));
  return results;
}
