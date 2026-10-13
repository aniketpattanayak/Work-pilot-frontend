import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const port = process.argv[3] || 5901;

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = path.join(dir, url === '/' ? 'index.html' : url);
  if (url === '/bundle.js') file = path.join(dir, 'bundle.js');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
  const ext = path.extname(file);
  const type = ext === '.js' ? 'application/javascript' : ext === '.html' ? 'text/html' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log('static server on', port));
