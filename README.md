# Strait Wars

A low-poly naval defense game. Steer a frigate through a mined strait while
autonomous CRAM and laser turrets hold off swarming drones, missiles, and
gun-boats — and command your own interceptors and guard drones.

Originally a single self-contained HTML file (preserved verbatim in
[`seedcontext.md`](./seedcontext.md)), now split into a proper full-stack app
ready to deploy on [Render](https://render.com).

```
strait-wars/
├── client/            # Vite frontend — the game
│   ├── index.html
│   └── src/
│       ├── main.js        # entry point
│       ├── config.js      # tunables, math helpers, constants
│       ├── world.js       # renderer, scene, camera, water, islands
│       ├── materials.js   # shared material palette
│       ├── factories.js   # ship / turret / enemy / mine mesh builders
│       ├── game.js        # state, systems, input, HUD, game loop
│       ├── leaderboard.js # game-over leaderboard UI
│       ├── api.js         # leaderboard API client (fails soft)
│       └── style.css
├── server/            # Express backend — static host + leaderboard API
│   └── src/
│       ├── index.js       # app entry; serves API + built client
│       ├── config.js
│       ├── scoreStore.js  # JSON-file leaderboard store (swappable)
│       └── routes/scores.js
├── render.yaml        # Render Blueprint (one web service)
├── seedcontext.md     # original single-file prototype
└── package.json       # npm workspaces (client + server)
```

## Requirements

- Node.js >= 18

## Getting started

```bash
npm install          # installs client + server workspaces
npm run dev          # Vite on :5173, API on :3000 (Vite proxies /api → :3000)
```

Open http://localhost:5173. The frontend proxies API requests to the backend,
so the leaderboard works end-to-end in development.

### Production build (what Render runs)

```bash
npm run build        # builds the client into client/dist
npm start            # Express serves client/dist + the API on $PORT (default 3000)
```

Then open http://localhost:3000.

## API

| Method | Route              | Description                              |
| ------ | ------------------ | ---------------------------------------- |
| GET    | `/api/health`      | Health check (used by Render).           |
| GET    | `/api/scores?limit=10` | Top scores, highest first.           |
| POST   | `/api/scores`      | Record a run `{ name, score, wave }`.    |

The leaderboard is persisted to a JSON file
(`server/data/scores.json` by default, or `SCORES_FILE`). `scoreStore.js` has a
small surface (`top`, `add`) so it can be swapped for Postgres/Redis later
without touching the routes.

## Deploying to Render

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** from the repo — it reads `render.yaml`
   and provisions one Node web service.
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Health check: `/api/health`
3. On Render's free plan the filesystem is ephemeral, so leaderboard scores
   reset on each deploy/restart. To keep them, attach a disk (see the commented
   `disk:` block in `render.yaml`) and point `SCORES_FILE` at its mount.

## Controls

- **◄ ►** buttons (or **A**/**D**/arrow keys) — steer to dodge mines
- **MISSILE** (or **1**) — launch an interceptor at the nearest incoming missile
- **DRONE** (or **2**) — deploy an autonomous anti-drone drone
- CRAM and laser turrets fire automatically
- **RESET** (or **R**) — restart
