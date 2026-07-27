import fs from 'node:fs';
import express from 'express';
import { config } from './config.js';
import { scoresRouter } from './routes/scores.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// --- API ---------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
app.use('/api/scores', scoresRouter);

// --- Static client (production) ----------------------------------------
// In dev the client is served by Vite (see client/vite.config.js proxy).
// In production Express serves the built SPA from client/dist.
if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile('index.html', { root: config.clientDist });
  });
} else {
  console.warn(
    `[server] client build not found at ${config.clientDist}. ` +
      'Run "npm run build" to serve the game. API is still available.'
  );
}

// --- Errors ------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(config.port, () => {
  console.log(`Strait Wars server listening on http://localhost:${config.port}`);
});
