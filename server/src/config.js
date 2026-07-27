import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo layout:  server/src/config.js -> server/ -> <root>/client/dist
const ROOT = path.resolve(__dirname, '..', '..');

export const config = {
  port: Number(process.env.PORT) || 3000,
  // Where the leaderboard is persisted. Override with SCORES_FILE (e.g. a Render
  // persistent disk mount) so scores survive restarts.
  scoresFile:
    process.env.SCORES_FILE || path.join(__dirname, '..', 'data', 'scores.json'),
  // Built client assets served in production.
  clientDist: path.join(ROOT, 'client', 'dist'),
  maxScores: 100,
  topScores: 10,
};
