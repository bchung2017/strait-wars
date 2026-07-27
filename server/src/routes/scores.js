import { Router } from 'express';
import * as store from '../scoreStore.js';

export const scoresRouter = Router();

// GET /api/scores?limit=10 -> leaderboard, highest first
scoresRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    res.json({ scores: await store.top(limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/scores { name, score, wave } -> records a run
scoresRouter.post('/', async (req, res, next) => {
  try {
    const { name, score, wave } = req.body ?? {};
    if (score === undefined || Number.isNaN(Number(score))) {
      return res.status(400).json({ error: 'score is required and must be a number' });
    }
    const result = await store.add({ name, score, wave });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
