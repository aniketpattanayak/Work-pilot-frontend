// Minimal static file server for a built SPA (dist/), with history-API
// fallback to index.html for client-side routes. No extra dependency -
// this is a QA harness, not the app itself.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

function serveStatic(rootDir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(rootDir, urlPath);
      if (!filePath.startsWith(rootDir)) filePath = rootDir; // guard traversal

      fs.stat(filePath, (err, stat) => {
        if (!err && stat.isFile()) {
          return sendFile(filePath, res);
        }
        // SPA fallback
        sendFile(path.join(rootDir, 'index.html'), res);
      });
    });
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}

function sendFile(filePath, res) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

module.exports = { serveStatic };
