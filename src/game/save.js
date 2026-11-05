// 周回数・エンディング・設定の保存（設計書の PlayerPrefs に相当）。
// Web ではブラウザに、Electron ではアプリのデータフォルダに保存される。
const KEY = 'ushimitsu-no-yado/v1';

const defaults = () => ({
  clearCount: 0,
  seen: { A: false, B: false, C: false },
  settings: { volume: 0.9, sensitivity: 1, quality: 'medium', v: 2 },
});

export function loadSave() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const settings = { ...d.settings, ...(raw.settings || {}) };
    // 画質の標準を「高」から「中」に変えたので、以前の保存は一度「中・自動調整あり」に戻す
    if ((raw.settings || {}).v !== 2) {
      settings.quality = 'medium';
      settings.qualityAuto = true;
      settings.v = 2;
    }
    return { ...d, ...raw, seen: { ...d.seen, ...(raw.seen || {}) }, settings };
  } catch (_) {
    return d;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (_) { /* 保存できない環境では、その回だけ有効 */ }
}
