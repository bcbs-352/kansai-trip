import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.BASE_PATH || '/kansai-trip/';
const port = Number(process.env.PORT || 0);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (pathname === '/' && base !== '/') { res.writeHead(302, { Location: base }).end(); return; }
  if (!pathname.startsWith(base)) { res.writeHead(404).end(); return; }
  const suffix = pathname.slice(base.length) || 'index.html';
  const file = path.resolve(root, suffix);
  if (!file.startsWith(root + path.sep) || suffix.split(/[\\/]/).some(p => p.startsWith('.'))) { res.writeHead(403).end(); return; }
  try { const body = await fs.readFile(file); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : body); } catch { res.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}${base}`));
