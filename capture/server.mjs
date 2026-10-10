import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = normalize(join(here, '..'));
const mime = {
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

export function startServer(port = 4173) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        let path = decodeURIComponent(url.pathname);
        if (path === '/') path = '/index.html';
        const full = normalize(join(root, path));
        if (!full.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
        const info = await stat(full);
        const file = info.isDirectory() ? join(full, 'index.html') : full;
        const bytes = await readFile(file);
        res.writeHead(200, {'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-store'});
        res.end(bytes);
      } catch (_) { res.writeHead(404); res.end('Not found'); }
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const server = await startServer(port);
  console.log(`Demo server: http://127.0.0.1:${port}`);
  process.on('SIGINT', () => server.close(() => process.exit(0)));
}
