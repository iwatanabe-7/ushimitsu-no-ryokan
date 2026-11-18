// 一周目をエンディング A まで通しで進める（game-studio/harness/run.mjs から使う）
export default async function (h) {
  await h.start();
  const step = async (id, ...v) => { await h.use(id, ...v); await h.close(); };
  await step('oshiire', 1.0, 0.4, 1.84, 0.9, 0.4);
  await h.waitGame(1500);
  await step('yukata', 1.2, 0.5, 2.1, 0.85, 0.5);
  await step('card', -1.0, -1.3, -1.3, 0.13, -2.05);
  await step('door', 0.3, 1.0, 0.0, 0.9, 1.8);
  // 帳場の行灯の傍らで手燭を手に入れる
  await step('teshoku', 0.7, 4.4, 0.7, 0.66, 5.38);
  // 帳場の札掛け（花札錠の答え）を見る
  await step('fudakake', -1.2, 4.3, -2.38, 1.45, 4.3);
  await step('shobuDoor', 4.64, 2.8, 4.64, 0.9, 1.86);
  await step('mirror', 3.5, 0.5, 3.45, 1.15, -0.7);
  await h.waitGame(2000); await h.close();
  await step('hiromaDoor', 14.6, 2.8, 14.6, 1.0, 3.6);
  await step('kamiza', 14.32, 8.1, 14.32, 0.2, 8.95);
  await h.waitGame(4500); await h.close();
  await step('yudonoDoor', 17.3, 2.7, 18.0, 1.0, 2.7);
  // 湯の底の札は、火を消さないと見えない（湯面に手燭の火が映る）
  await h.game((g) => g.candle.lit() && g.candle.toggle());
  await h.waitGame(800);
  await step('bathCard', 18.85, -2.3, 19.75, -0.3, -2.35);
  await h.game((g) => g.candle.toggle());
  await h.waitGame(1300);
  await step('kikyoDoor', 8.9, 2.7, 8.9, 0.9, 1.95);
  await h.game((g) => (g.state.kikyoAnim = 1));
  await step('kikyoDesk', 9.3, 0.6, 9.3, 0.3, -0.65);
  await h.until((g) => g.phase() === 'play' && g.state.lanternsOut, { timeout: 180000 });
  await h.use('lock', 9.3, 6.6, 9.45, 1.0, 7.3);
  await h.until((g) => g.ui.modal === 'lock', { timeout: 30000 });
  // 答えは帳場の札掛けの順（遊ぶたびに変わる）。↑ で札を替える（ほかの札入れにある札は飛ばされる）ので、
  // 目当ての札が出るまで押す
  const order = await h.game((g) => g.state.lockOrder);
  for (let i = 0; i < 3; i++) {
    for (let n = 0; n < 4 && (await h.game((g, i) => g.ui._lock.slots[i], i)) !== order[i]; n++) {
      await h.page.keyboard.press('ArrowUp');
      await h.wait(80);
    }
    if (i < 2) await h.page.keyboard.press('ArrowRight');
  }
  await h.page.keyboard.press('Enter');
  // 驚かせ3：背後の女将の影が壁に伸びたところを撮る（手燭は細って影を落とさない）
  const c0 = await h.game((g) => g.clock());
  await h.until((g, c0) => g.clock() > c0 + 4.6, { timeout: 60000, arg: c0, label: '驚かせ3の影' });
  await h.shot('genkan-scare', { clean: true });
  await h.until((g) => g.phase() === 'end', { timeout: 180000 });
  await h.wait(5000);
  await h.shot('ending-a');
  return { state: await h.game((g) => ({ ...g.state, visited: undefined })) };
}
