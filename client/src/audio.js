// Self-contained procedural background music (Web Audio API) — no external
// files, no licensing. A driving 4-on-the-floor beat with a bass line and a
// fast arpeggio over an Am–F–C–G loop, for that endless-scroll viral-video
// feel. Everything is wrapped so an audio failure never affects the game.

let ctx = null;
let master = null;
let noiseBuf = null;
let started = false;
let muted = false;
let timer = null;
let nextNoteTime = 0;
let step = 0;

const BPM = 132;
const STEP = 60 / BPM / 4; // sixteenth note
const VOL = 0.32;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Am, F, C, G — one bar (16 steps) each
const BASS = [33, 29, 36, 31]; // A1, F1, C2, G1
function arpBar(triad) {
  const ext = [triad[0], triad[1], triad[2], triad[0] + 12];
  const order = [0, 1, 2, 3, 2, 1];
  const seq = [];
  for (let i = 0; i < 16; i++) seq.push(ext[order[i % order.length]]);
  return seq;
}
const ARP = [
  arpBar([69, 72, 76]), // Am
  arpBar([65, 69, 72]), // F
  arpBar([60, 64, 67]), // C
  arpBar([67, 71, 74]), // G
];

function buildNoise() {
  const n = ctx.sampleRate * 0.4;
  noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
}

function kick(t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.22);
}
function hat(t) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  src.connect(hp).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.06);
}
function bass(t, m, dur) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = midi(m);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 650;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(lp).connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function arp(t, m, dur) {
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = midi(m);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function scheduleStep(t, s) {
  const bar = Math.floor(s / 16) % 4;
  const i = s % 16;
  if (i % 4 === 0) {
    kick(t);
    bass(t, BASS[bar], STEP * 3.5);
  }
  if (i % 2 === 1) hat(t);
  arp(t, ARP[bar][i], STEP * 0.9);
}

function scheduler() {
  while (nextNoteTime < ctx.currentTime + 0.12) {
    scheduleStep(nextNoteTime, step);
    nextNoteTime += STEP;
    step++;
  }
}

export function startMusic() {
  if (started) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    started = true;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOL;
    master.connect(ctx.destination);
    buildNoise();
    if (ctx.state === 'suspended') ctx.resume();
    nextNoteTime = ctx.currentTime + 0.1;
    step = 0;
    timer = setInterval(scheduler, 25);
  } catch (e) {
    console.warn('[audio] music unavailable:', e.message);
  }
}

export function toggleMute() {
  muted = !muted;
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : VOL, ctx.currentTime, 0.02);
  return muted;
}
