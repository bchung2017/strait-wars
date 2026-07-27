import { getScores, submitScore } from './api.js';

const wrap = document.getElementById('lbWrap');
const listEl = document.getElementById('lbList');
const nameEl = document.getElementById('lbName');
const submitEl = document.getElementById('lbSubmit');
const msgEl = document.getElementById('lbMsg');

let pending = null; // { score, wave } for the current game-over run
let submitted = false;

const NAME_KEY = 'strait-wars:name';

function render(scores, myIndex = -1) {
  if (!scores) {
    listEl.innerHTML = '<li style="list-style:none;color:#7fa9bd">leaderboard offline</li>';
    return;
  }
  if (!scores.length) {
    listEl.innerHTML = '<li style="list-style:none;color:#7fa9bd">no runs logged yet</li>';
    return;
  }
  listEl.innerHTML = scores
    .map((s, i) => {
      const name = String(s.name || 'ANON').replace(/[<>&]/g, '');
      const cls = i === myIndex ? ' class="me"' : '';
      return `<li${cls}>${name}<span>${s.score}</span></li>`;
    })
    .join('');
}

async function refresh(myIndex = -1) {
  render(await getScores(10), myIndex);
}

async function doSubmit() {
  if (submitted || !pending) return;
  const name = (nameEl.value || 'ANON').trim().slice(0, 12) || 'ANON';
  localStorage.setItem(NAME_KEY, name);
  submitEl.disabled = true;
  msgEl.textContent = 'logging…';
  const result = await submitScore({ name, score: pending.score, wave: pending.wave });
  if (result) {
    submitted = true;
    msgEl.textContent = result.rank ? `Ranked #${result.rank}` : 'Logged.';
    const myIndex = (result.top || []).findIndex(
      (e) => e.name === name && e.score === pending.score
    );
    render(result.top, myIndex);
  } else {
    msgEl.textContent = 'Could not reach leaderboard.';
    submitEl.disabled = false;
  }
}

export function initLeaderboard() {
  // Interacting with the leaderboard must not trigger the overlay's
  // "tap to redeploy" restart handler.
  wrap.addEventListener('click', (e) => e.stopPropagation());
  wrap.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  submitEl.addEventListener('click', doSubmit);
  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSubmit();
  });
  nameEl.value = localStorage.getItem(NAME_KEY) || '';
}

export function showLeaderboard(run) {
  pending = run;
  submitted = false;
  submitEl.disabled = !(run.score > 0);
  msgEl.textContent = run.score > 0 ? '' : 'No score to log.';
  refresh();
}
