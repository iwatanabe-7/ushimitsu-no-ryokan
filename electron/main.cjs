// Electron 版の起動。dist（vite build の出力）を窓に表示する
//
// 安全のための決まり（Electron のセキュリティチェックリストに沿う）
// - ページは Node を使えない（contextIsolation / sandbox / nodeIntegration: false、preload なし）
// - dist は file:// ではなく専用の app:// で配信し、dist の外のファイルは読ませない
// - CSP で、自分のファイル以外からスクリプトや通信を読み込ませない
// - 権限はポインタロックと全画面だけ許可する
// - ゲームの外へのページ移動・新しい窓は開かせない
const { app, BrowserWindow, Menu, protocol, net, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const SCHEME = 'app';
const HOST = 'ryokan';
const ORIGIN = `${SCHEME}://${HOST}`;
const DIST = path.join(__dirname, '..', 'dist');
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

// 画像・音声ファイルは使わず、テクスチャは canvas、音は Web Audio で作る。フォントは dist に同梱
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const ALLOWED_PERMISSIONS = new Set(['pointerLock', 'fullscreen']);

// app:// を https と同じ扱い（安全な文脈、ES モジュール、fetch が使える）にする。ready より前に呼ぶ
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// 二重に起動したら、先に開いている窓を前に出す
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(() => {
    serveDist();
    limitPermissions();
    setMenu();
    createWindow();
  });
}
app.on('window-all-closed', () => app.quit());

// app://ryokan/… を dist の中のファイルに対応させる。dist の外を指す道（../ など）は 404
function serveDist() {
  protocol.handle(SCHEME, async (req) => {
    const url = new URL(req.url);
    if (url.host !== HOST) return new Response('Not found', { status: 404 });
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.normalize(path.join(DIST, rel));
    if (file !== DIST && !file.startsWith(DIST + path.sep)) return new Response('Not found', { status: 404 });
    let res;
    try {
      res = await net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Not found', { status: 404 }); // dist に無いファイル
    }
    if (!res.ok) return res;
    const headers = new Headers(res.headers);
    if (file.endsWith('.html')) headers.set('Content-Security-Policy', CSP);
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(res.body, { status: res.status, headers });
  });
}

function limitPermissions() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(ALLOWED_PERMISSIONS.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));
}

// Windows / Linux はメニューを出さない。mac は Cmd+Q や、宿帳の名前欄でのコピー・貼り付けに最小限のメニューが要る
function setMenu() {
  if (process.platform !== 'darwin') return Menu.setApplicationMenu(null);
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#0b0908',
    title: '丑三つの旅館',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: !app.isPackaged, // 配布版では開発者ツールを開けない
    },
  });

  // F11 で全画面を切り替える
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  // ゲームの外へは移動しない（「タイトルへ戻る」の再読み込みは同じページなので通る）
  const home = DEV_URL ? new URL(DEV_URL).origin : ORIGIN;
  win.webContents.on('will-navigate', (e, url) => {
    if (new URL(url).origin !== home) e.preventDefault();
  });
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.once('ready-to-show', () => win.show());
  win.loadURL(DEV_URL || `${ORIGIN}/index.html`);
}
