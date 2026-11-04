// 開発用：Vite の開発サーバーを立ててから Electron で開く（コードの変更がすぐ反映される）
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electron from 'electron';

const server = await createServer({ server: { port: 5173 } });
await server.listen();
const url = server.resolvedUrls.local[0];
const child = spawn(electron, ['.'], { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
child.on('close', async () => {
  await server.close();
  process.exit(0);
});
