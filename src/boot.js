// 起動：明朝体を読み込んでから本編を読み込む（文字を描くテクスチャがあるため）
import './style.css';

// 通常は明朝体をゲームに同梱する（Electron 版はオフラインで動く）。
// VITE_FONTS=cdn のときだけ Google Fonts から読む（ファイル数を減らしたい Web 配信用）
if (import.meta.env.VITE_FONTS === 'cdn') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;700&family=Yuji+Boku&display=swap';
  document.head.append(link);
} else {
  await Promise.all([
    import('@fontsource/shippori-mincho/400.css'),
    import('@fontsource/shippori-mincho/600.css'),
    import('@fontsource/shippori-mincho/700.css'),
    import('@fontsource/yuji-boku/400.css'),
  ]);
}

const boot = document.getElementById('boot');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SAMPLE = '椿菖蒲桔梗宿一期会水面の月千代佐伯小松遠野誠正ゆり帳場お母さんへ二月二日山で道に迷いこの宿に泊まる女将は宿帳に名前を書けと何度も言う昭和四十七年十月三日九平成三八十二今宵松竹';
try {
  await Promise.race([
    Promise.all([
      document.fonts.load('700 30px "Shippori Mincho"', SAMPLE),
      document.fonts.load('600 24px "Shippori Mincho"', '0123456789' + SAMPLE),
      document.fonts.load('400 22px "Shippori Mincho"', SAMPLE),
      document.fonts.load('400 60px "Yuji Boku"', '丑三つの旅館'),
    ]),
    wait(4000),
  ]);
} catch (_) { /* フォントが読めなくても代わりの明朝体で続ける */ }
try {
  await import('./main.js');
  boot.hidden = true;
} catch (e) {
  const msg = document.getElementById('bootMsg');
  msg.textContent = '読み込みに失敗しました。再読み込みしてください。';
  msg.hidden = false;
  console.error(e);
}
