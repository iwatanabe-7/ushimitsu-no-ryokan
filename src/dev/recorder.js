// 開発者向けの録画機能：ゲーム画面（canvas）とゲームの音（Web Audio）を MediaRecorder で1本の動画にする。
// 宣伝用の動画を撮るためのもの。開発者モード（npm run dev で開き、URL に ?rec を付けたとき）だけ読み込まれる（boot.js）。
//
//   F9 または画面左下のボタン … 録画の開始／停止。止めると動画がダウンロードされる
//
// - 映るのは canvas だけ。字幕・照準・メニューなどの HTML の文字と、このボタン自体は映らない
// - 音は、スピーカー（AudioContext.destination）へ出る音をすべて録音用の出口にも分けて録る。
//   読み上げの声（speechSynthesis）は Web Audio を通らないので録れない
// - 保存形式は mp4（H.264 + AAC）が使えればそれ、だめなら webm

const MIME = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];
const VIDEO_BPS = 12_000_000;
const AUDIO_BPS = 192_000;
const FPS = 60;

// ---- 音を分ける（AudioContext を作る前に差し替える必要があるので、読み込んだ時点で行う）
const taps = new Map();
const tapOf = (ctx) => {
  let t = taps.get(ctx);
  if (!t) taps.set(ctx, (t = ctx.createMediaStreamDestination()));
  return t;
};
const connect = AudioNode.prototype.connect;
AudioNode.prototype.connect = function (dest, ...rest) {
  const r = connect.call(this, dest, ...rest);
  if (dest instanceof AudioDestinationNode) connect.call(this, tapOf(this.context));
  return r;
};

// ---- ボタン
const btn = document.createElement('button');
btn.type = 'button';
btn.style.cssText =
  'position:fixed;left:12px;bottom:12px;z-index:2147483647;padding:6px 12px;border:1px solid #a33;border-radius:4px;' +
  'background:rgba(20,0,0,.75);color:#f88;font:600 13px sans-serif;cursor:pointer;opacity:.85';
document.body.appendChild(btn);
if (window.__harness) btn.style.display = 'none'; // 自動テストの画像に映り込まないように

let rec = null;
let chunks = [];
let t0 = 0;
let timer = 0;

const label = () => {
  if (!rec) return (btn.textContent = '● 録画（F9）');
  const s = Math.floor((performance.now() - t0) / 1000);
  btn.textContent = `■ 停止 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}${rec.__noAudio ? '（音なし）' : ''}`;
};

const stamp = () => {
  const d = new Date();
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

function start() {
  const canvas = document.getElementById('view') || document.querySelector('canvas');
  if (!canvas) return;
  const stream = canvas.captureStream(FPS);
  const audio = [...taps.values()].flatMap((t) => t.stream.getAudioTracks());
  for (const tr of audio) stream.addTrack(tr);
  const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  chunks = [];
  rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS });
  rec.__noAudio = audio.length === 0;
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(1000);
  t0 = performance.now();
  timer = setInterval(label, 500);
  label();
}

function stop() {
  if (!rec) return;
  const r = rec;
  r.onstop = () => save(new Blob(chunks, { type: r.mimeType || 'video/webm' }));
  r.stop();
  rec = null;
  clearInterval(timer);
  label();
}

function save(blob) {
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ushimitsu-ryokan_${stamp()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const toggle = () => (rec ? stop() : start());
btn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggle();
  btn.blur(); // フォーカスが残ると、ゲームのキー操作を横取りする
});
// ゲームより先に受け取る（照準を固定して遊んでいるあいだはボタンを押せないので F9 で）
window.addEventListener('keydown', (e) => {
  if (e.code !== 'F9' || e.repeat) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  toggle();
}, true);

label();
// 自動テスト・ハーネスから使う
window.__recorder = { start, stop, recording: () => !!rec, mime: () => MIME.find((m) => MediaRecorder.isTypeSupported(m)) || '' };
