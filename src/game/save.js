// 周回数・エンディング・設定の保存（設計書の PlayerPrefs に相当）。
// Web ではブラウザに、Electron ではアプリのデータフォルダに保存される。
const KEY = 'ushimitsu-no-yado/v1';

const defaults = () => ({
  clearCount: 0,
  seen: { A: false, B: false, C: false },
  settings: { volume: 0.9, sensitivity: 1, quality: 'high' },
});

export function loadSave() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      ...d,
      ...raw,
      seen: { ...d.seen, ...(raw.seen || {}) },
      settings: { ...d.settings, ...(raw.settings || {}) },
    };
  } catch (_) {
    return d;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (_) { /* 保存できない環境では、その回だけ有効 */ }
}
