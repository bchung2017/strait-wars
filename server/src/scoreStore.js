import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

/**
 * Tiny JSON-file backed leaderboard store.
 *
 * Deliberately dependency-free so the scaffold deploys anywhere. The read/write
 * surface (`top`, `add`) is small enough to swap for Postgres/Redis later
 * without touching the routes.
 */

let cache = null;

async function load() {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(config.scoresFile, 'utf8');
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[scoreStore] could not read ${config.scoresFile}:`, err.message);
    }
    cache = [];
  }
  return cache;
}

async function persist() {
  await fs.mkdir(path.dirname(config.scoresFile), { recursive: true });
  await fs.writeFile(config.scoresFile, JSON.stringify(cache, null, 2));
}

function sortDesc(list) {
  return [...list].sort((a, b) => b.score - a.score);
}

export async function top(limit = config.topScores) {
  const list = await load();
  return sortDesc(list).slice(0, limit);
}

export async function add({ name, score, wave }) {
  const list = await load();
  const entry = {
    name: String(name || 'ANON').slice(0, 12).trim() || 'ANON',
    score: Math.max(0, Math.floor(Number(score) || 0)),
    wave: Math.max(0, Math.floor(Number(wave) || 0)),
    at: new Date().toISOString(),
  };
  list.push(entry);
  cache = sortDesc(list).slice(0, config.maxScores);
  await persist();

  const rank = cache.findIndex((e) => e === entry) + 1;
  return { entry, rank: rank || null, top: cache.slice(0, config.topScores) };
}
