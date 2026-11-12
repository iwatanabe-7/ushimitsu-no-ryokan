// 一周目をエンディング A まで通しで進める（game-studio/harness/run.mjs から使う）
export default async function (h) {
  await h.start();
  const step = async (id, ...v) => { await h.use(id, ...v); await h.close(); };
  await step('oshiire', 1.0, 0.4, 1.84, 0.9, 0.4);
  await h.waitGame(1500);
  await step('yukata', 1.2, 0.5, 2.1, 0.85, 0.5);
  await step('card', -1.0, -1.3, -1.3, 0.13, -2.05);
  await step('door', 0.3, 1.0, 0.0, 0.9, 1.8);
  await step('shobuDoor', 4.64, 2.8, 4.64, 0.9, 1.86);
  await step('mirror', 3.5, 0.5, 3.45, 1.15, -0.7);
  await h.waitGame(2000); await h.close();
  await step('hiromaDoor', 14.6, 2.8, 14.6, 1.0, 3.6);
  await step('kamiza', 14.32, 8.1, 14.32, 0.2, 8.95);
  await h.waitGame(4500); await h.close();
  await step('yudonoDoor', 17.3, 2.7, 18.0, 1.0, 2.7);
  await step('bathCard', 18.85, -2.3, 19.75, -0.3, -2.35);
  await step('kikyoDoor', 8.9, 2.7, 8.9, 0.9, 1.95);
  await h.game((g) => (g.state.kikyoAnim = 1));
  await step('kikyoDesk', 9.3, 0.6, 9.3, 0.3, -0.65);
  await h.until((g) => g.phase() === 'play' && g.state.lanternsOut, { timeout: 180000 });
  await h.use('lock', 9.3, 6.6, 9.45, 1.0, 7.3);
  await h.until((g) => g.ui.modal === 'lock', { timeout: 30000 });
  // 宿帳の到着順：桔梗 → 菖蒲 → 椿（↑ で 空 → 椿 → 菖蒲 → 桔梗）
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowUp', 'Enter']) {
    await h.page.keyboard.press(k);
    await h.wait(120);
  }
  await h.until((g) => g.phase() === 'end', { timeout: 180000 });
  await h.wait(5000);
  await h.shot('ending-a');
  return { state: await h.game((g) => ({ ...g.state, visited: undefined })) };
}
