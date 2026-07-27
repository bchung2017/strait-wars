import * as THREE from 'three';

// ---------- math helpers ----------
export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- tunables ----------
export const CFG = {
  spawnR: 420,
  worldFog: 900,
  ship: { hp: 100, r: 14 },
  kamikaze: { prox: 44, dmg: 9 },
  mine: { r: 6, hitR: 16, dmg: 22, spawn: [1.3, 2.6] },
  cram: { speed: 480, fireCd: 0.05, dmg: 12, r: 2.2, life: 2.4, range: 480 },
  laserT: { dps: 55, range: 360 },
  hack: null,
  interceptor: { max: 6, regen: 4.0, speed: 240, turn: 3.4, kill: 12 },
  drone: { max: 3, regen: 7.0, life: 22, speed: 70, range: 160, fireCd: 0.35, dmg: 24 },
};

export const SKY = 0xbfe3f0;

// what enemies attack / defenses protect. Mutated in place (.x) as the ship steers.
export const SHIP_POS = V(0, 8, 0);

export const CRAM_MUZZLES = [V(0, 17, 12), V(0, 16, -14), V(-8, 15, -2), V(8, 15, -2)];
export const LASER_MUZZLES = [V(-7, 13, -10), V(7, 13, -10)];

export const LANE = 55;
export const LANE_MAX = 74;
export const LAT_SPEED = 100;
