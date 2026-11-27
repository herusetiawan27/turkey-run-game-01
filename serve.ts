// A minimal static file server for game/, so the game can be played locally
// with no build step: `node serve.ts [--port 8080]` then open the URL it
// prints. Standard library only; paths are confined to game/.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameDir = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const parsed = portFlag === -1 ? 8080 : Number(args[portFlag + 1]);
const port = Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 8080;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  const file = join(gameDir, rel === '' ? 'index.html' : rel);
  if (file !== gameDir && !file.startsWith(gameDir + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  const target = existsSync(file) && statSync(file).isDirectory() ? join(file, 'index.html') : file;
  if (!existsSync(target)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' });
  createReadStream(target).pipe(res);
}).listen(port, () => {
  console.log(`Gobble Run at http://localhost:${port}`);
});
