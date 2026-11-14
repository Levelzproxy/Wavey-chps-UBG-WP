// Wavey chps relay — Wisp server + static host in one process.
// Deploy this folder to Render (free web service works), Railway, Fly or a VPS.
//
// It does two jobs:
//   1. serves the proxy files in ./public over HTTPS
//   2. runs the Wisp endpoint at /wisp/ (WebSocket upgrade)
//
// Because it serves both, the proxy is same-origin with its relay: no CORS
// and no cross-site WebSocket issues. It deliberately sends no COOP/COEP, so
// the Games/GBA/AI iframes can embed third-party pages normally.
//
// You can still upload ./public to GitHub Pages and use this only as a relay:
// put wss://<your-app>.onrender.com/wisp/ in Wavey chps → Settings → Tunnel.

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

function headersFor(file) {
  const h = {
    // No COOP/COEP here on purpose. Cross-origin isolation blocks the Games/GBA/AI
    // iframes (they don't send Cross-Origin-Resource-Policy), and the original static
    // site never had those headers either. Scramjet still works without them.
    "access-control-allow-origin": "*",
  };
  const ext = path.extname(file).toLowerCase();
  h["content-type"] = MIME[ext] || "application/octet-stream";
  // The worker and the shell must revalidate, or a deploy never reaches users.
  h["cache-control"] = /(^|\/)(sw\.js|index\.html|app\.js)$/.test(file)
    ? "no-cache"
    : ext === ".wasm" || ext === ".js" || ext === ".mjs"
      ? "public, max-age=3600"
      : "public, max-age=86400";
  return h;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, wisp: "/wisp/" }));
      return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) {
      // Single-page shell: unknown paths still load the app.
      const shell = path.join(PUBLIC, "index.html");
      const body = await readFile(shell).catch(() => null);
      if (!body) {
        res.writeHead(404, { "content-type": "text/plain" }).end("Not found. Put the proxy files in ./public");
        return;
      }
      res.writeHead(200, headersFor("index.html")).end(body);
      return;
    }
    res.writeHead(200, headersFor(rel)).end(await readFile(file));
  } catch (err) {
    console.error("request failed", err);
    res.writeHead(500, { "content-type": "text/plain" }).end("Server error");
  }
});

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url || "/", "http://localhost");
  if (pathname === "/wisp/" || pathname === "/wisp") {
    req.url = "/wisp/";
    wisp.routeRequest(req, socket, head);
    return;
  }
  socket.end();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Wavey relay listening on 0.0.0.0:" + PORT + " (wisp at /wisp/)");
});
