// 手燭と女将の影（マイルストーン1）の確かめ。?dark=1 で驚かせ2のあとの暗い廊下から始める
//   node harness/run.mjs ushimitsu-no-ryokan candle
export default async function (h) {
  const results = {};
  const check = (name, ok, detail) => {
    results[name] = ok ? 'ok' : `NG ${detail ?? ''}`;
    if (!ok) throw new Error(`${name}: ${detail ?? ''}`);
  };
  const C = (fn, arg) => h.game((g, a) => (0, eval)(`(${a.src})`)(g.candle, a.arg), { src: fn.toString(), arg });
  const clock = () => h.game((g) => g.clock());
  const lights = () => h.game(() => { let n = 0; window.__inn.G.scene.traverse((o) => o.isPointLight && n++); return n; });
  const DARK = [3.0, 2.7, 6.0, 1.5, 2.7]; // 暗い廊下の真ん中、東を向く

  await h.open('?dark=1');
  const lightsBefore = await lights();
  await h.start();
  await h.waitGame(800);

  // 手燭を切り替えられる
  check('最初は火が点いている', await C((c) => c.lit()));
  await C((c) => c.toggle());
  await h.waitGame(330);
  await h.shot('candle-blow', { clean: true }); // 口元へ持ち上げて、炎が倒れるところ
  await h.waitGame(700); // 吹き消して手元へ戻す
  check('F で火が消える', !(await C((c) => c.lit())));
  await C((c) => c.toggle());
  await h.waitGame(600);
  check('点けるのに 1.1 秒かかる', !(await C((c) => c.lit())));
  await h.shot('candle-match', { clean: true }); // 燐寸を芯へ寄せたところ（撮るあいだもゲーム内時間が進むので、確かめたあとに撮る）
  await h.waitGame(700);
  check('もう一度押すと点く', await C((c) => c.lit()));

  // 文章中は切り替えない
  await h.game((g) => g.ui.say(['テスト']));
  const r = await C((c) => c.toggle());
  check('文章中は切り替えない', r === false && (await C((c) => c.lit())));
  await h.close();

  // スマホの「火」ボタン：「調べる」と重ならない
  const boxes = await h.page.evaluate(() => {
    document.getElementById('touch').hidden = false;
    const a = document.getElementById('act').getBoundingClientRect();
    const f = document.getElementById('fire').getBoundingClientRect();
    document.getElementById('touch').hidden = true;
    return { a: [a.left, a.right, a.top, a.bottom], f: [f.left, f.right, f.top, f.bottom], fw: f.width };
  });
  const overlap = !(boxes.f[1] <= boxes.a[0] || boxes.f[0] >= boxes.a[1] || boxes.f[3] <= boxes.a[2] || boxes.f[2] >= boxes.a[3]);
  check('スマホに火ボタンがあり、調べると重ならない', !overlap && boxes.fw >= 64, JSON.stringify(boxes));

  // 暗い廊下へ。暗がりになる
  await h.look(...DARK);
  await h.waitGame(1200);
  check('廊下は暗がり', await C((c) => c.dark()));

  // 実光源の数が増えない
  check('実光源の数が増えない', (await lights()) === lightsBefore, `${lightsBefore} → ${await lights()}`);

  // 影の描き直しが間引かれる（女将なし、歩いて手燭が動くあいだ 15回/秒以下）
  await C((c) => c.setKehai(0));
  const u0 = await C((c) => c.shadowUpdates());
  const t0 = await clock();
  await h.page.keyboard.down('KeyW');
  await h.waitGame(2000);
  await h.page.keyboard.up('KeyW');
  const rate = ((await C((c) => c.shadowUpdates())) - u0) / ((await clock()) - t0);
  check('影の描き直しが間引かれる', rate <= 15.5, `${rate.toFixed(1)}/秒`);

  // 一時停止中は気配が止まる
  await h.look(...DARK);
  await C((c) => c.setKehai(20));
  await h.game((g) => (g.state.paused = true));
  const k0 = await C((c) => c.kehai());
  await h.wait(1500);
  const k1 = await C((c) => c.kehai());
  await h.game((g) => (g.state.paused = false));
  check('一時停止中は気配が止まる', k0 === k1, `${k0} → ${k1}`);

  // 2026-11-17 ユーザーの判断で、途中の女将の影と「見つかって戻される」は使わない（balance.js の OkamiShadowEnabled / CatchEnabled）
  // 段階は進み、炎が傾く。影は出ない
  await C((c) => c.setKehai(75));
  await h.waitGame(600);
  const s2 = await C((c) => ({ stage: c.stage(), on: c.okamiOn(), y: c.okamiPos()[1] }));
  check('段階は進むが、女将の影は出ない', s2.stage === 2 && !s2.on && s2.y < -10, JSON.stringify(s2));
  check('女将の姿は映らない', await C((c) => c.okamiHidden()));

  // 気配が 100 になっても見つからず、その場で遊び続けられる
  const before = await h.game(() => window.__inn.player.pos.toArray());
  await C((c) => c.setKehai(100));
  await h.waitGame(2500);
  const st = await h.game((g) => ({ phase: g.phase(), caught: g.candle.caught(), busy: g.candle.busy(), lit: g.candle.lit(), p: window.__inn.player.pos.toArray() }));
  const moved = Math.hypot(st.p[0] - before[0], st.p[2] - before[2]);
  check('気配100でも見つからず、移動もしない', st.phase === 'play' && st.caught === 0 && !st.busy && st.lit && moved < 0.05, JSON.stringify({ ...st, moved }));

  // 火を消せる・点け直せる（暗がりで）
  check('火を消せる', await C((c) => c.toggle()));
  await h.waitGame(1000); // 吹き消す動作（約0.8秒）が終わるまで待つ
  check('火を消すと暗い', !(await C((c) => c.lit())));
  await C((c) => c.toggle());
  await h.waitGame(1300);

  // 壁に近づくと手燭が弱まる（まぶしさ対策）
  await h.look(...DARK);
  await h.waitGame(800);
  const farNear = (await C((c) => c.near())).near;
  await h.look(3.0, 2.2, 3.0, 1.5, 1.0); // 北の襖に向かって、ぎりぎりまで寄る
  await h.waitGame(800);
  // 影の灯りの強さは、手燭ではなく近くの灯りが受け持つこともあるので、手燭の弱め具合そのものを見る
  const nd = await C((c) => c.near());
  check('壁に近づくと手燭が弱まる', nd.near < 0.1 && nd.near < farNear * 0.3, `${farNear.toFixed(2)} → ${nd.near.toFixed(2)} ${JSON.stringify(nd)}`);
  await h.shot('candle-near-wall', { clean: true });

  // 気配は暗い廊下に立っているだけで約29秒で100（ゲーム内時間）。DARK は菖蒲の間の襖から 3m 以内なので、その倍率は外して測る
  await h.look(...DARK);
  await h.waitGame(800);
  await h.game((g) => (g.state.lanternsOut = false));
  await C((c) => c.setKehai(0));
  const tc = await clock();
  await h.waitGame(5000, { timeout: 400000 });
  const kc = await C((c) => c.kehai());
  const rise = 100 / (kc / ((await clock()) - tc));
  check('立ち止まって溜まる速さ', rise > 27 && rise < 31, `${rise.toFixed(1)}秒`);
  await h.game((g) => (g.state.lanternsOut = true));

  return results;
}
