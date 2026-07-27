// Thin leaderboard API client. Every call fails soft so the game stays fully
// playable offline / when no backend is deployed.

export async function getScores(limit = 10) {
  try {
    const res = await fetch(`/api/scores?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.scores || [];
  } catch (err) {
    console.warn('[api] getScores failed:', err.message);
    return null;
  }
}

export async function submitScore(entry) {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[api] submitScore failed:', err.message);
    return null;
  }
}
