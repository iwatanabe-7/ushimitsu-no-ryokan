// 主な場面の画像を撮る（照準・文章なし）
export default async function (h) {
  await h.start();
  await h.game((g) => Object.assign(g.state, { doorOpen: true, doorAnim: 1, oshiireOpen: true, oshiireAnim: 1, shobuOpen: true, shobuAnim: 1, hiromaOpen: true, hiromaAnim: 1, yudonoOpen: true, yudonoAnim: 1, kikyoOpen: true, kikyoAnim: 1, hasKey: true, hasTsubaki: true }));
  for (const [name, ...v] of await h.game((g) => g.views)) {
    await h.look(...v);
    await h.wait(2500);
    await h.shot(name, { clean: true });
  }
}
