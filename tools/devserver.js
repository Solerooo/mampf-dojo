// Kleiner lokaler Server zum Testen (kein Teil der App).
// Aufruf: node tools/devserver.js [port]   → http://localhost:8777
// Extra: POST /__speichern?datei=icons/name.png speichert ein PNG (für tools/icons.html).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const WURZEL = path.join(__dirname, '..');
const PORT = +process.argv[2] || 8777;
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/__speichern') {
    const datei = url.searchParams.get('datei') || '';
    if (!/^icons\/[a-z0-9-]+\.png$/.test(datei)) { res.writeHead(400); return res.end('nein'); }
    const teile = [];
    req.on('data', d => teile.push(d));
    req.on('end', () => { fs.writeFileSync(path.join(WURZEL, datei), Buffer.concat(teile)); res.writeHead(200); res.end('ok'); console.log('gespeichert', datei); });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const voll = path.normalize(path.join(WURZEL, p));
  if (!voll.startsWith(WURZEL)) { res.writeHead(403); return res.end(); }
  fs.readFile(voll, (fehler, daten) => {
    if (fehler) { res.writeHead(404); return res.end('nicht gefunden'); }
    res.writeHead(200, { 'Content-Type': TYPEN[path.extname(voll)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(daten);
  });
}).listen(PORT, () => console.log('Mampf-Dojo Dev-Server: http://localhost:' + PORT));
