# Wavey chps

One Node process that does two jobs:

1. **Wisp relay** at `/wisp/` — the tunnel all proxied traffic goes through.
2. **Static host** for the proxy files in `./public` — served with the
   `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers that
   make the page cross-origin isolated (needed by sites that use
   `SharedArrayBuffer`: games, editors, wasm tools).

It has no database, no build step and no configuration.

## Deploy on Render (free)

1. Put this folder in a GitHub repo (private is fine).
2. Render → **New → Web Service** → connect the repo.
3. Runtime **Node**, Build Command `npm install`, Start Command `npm start`.
4. Deploy. Render gives you `https://<name>.onrender.com`.

Open that URL: it serves the proxy from `./public` and the relay from the same
origin, so nothing needs to be configured. The app detects `/health` and uses
`wss://<name>.onrender.com/wisp/` automatically.

Free Render services sleep after ~15 minutes idle; the first request after that
takes 30–60 seconds. Keep the tab open (the app pings every few minutes) or use
a paid instance to avoid it.

## Use it only as a relay (app on GitHub Pages)

1. Upload the contents of `./public` to your GitHub Pages repo.
2. Open the site → **Settings → Tunnel** → paste
   `wss://<name>.onrender.com/wisp/` → **Use**.
3. Leave the mode on **Auto** so the app falls back to public relays when your
   instance is asleep or down.

GitHub Pages cannot send the COOP/COEP headers, so pages served from Pages are
not cross-origin isolated. The engine still works; only sites that require
`SharedArrayBuffer` lose their threaded path. Serving `./public` from this
server avoids that limitation entirely.

## Endpoints

| Path | What it is |
| --- | --- |
| `/` | the proxy app |
| `/health` | `{ "ok": true, "wisp": "/wisp/" }` |
| `/wisp/` | Wisp WebSocket endpoint |

## Run locally

```bash
npm install
npm start          # http://localhost:8080
```

`PORT` is read from the environment (Render sets it for you).
