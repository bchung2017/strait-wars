import * as THREE from 'three';
import {
  TAU,
  clamp,
  rand,
  V,
  CFG,
  SHIP_POS,
  CRAM_MUZZLES,
  LASER_MUZZLES,
  LANE,
  LANE_MAX,
  LAT_SPEED,
} from './config.js';
import { M, flat } from './materials.js';
import { scene, camera, renderer, waterMat, islands } from './world.js';
import {
  makeShip,
  makeCramTurret,
  makeLaserTurret,
  makeDrone,
  makeMissile,
  makeBoat,
  makeMine,
} from './factories.js';
import { initLeaderboard, showLeaderboard } from './leaderboard.js';

let shipX = 0;
const move = { left: false, right: false };

// ---------- ship + turrets ----------
const ship = makeShip();
scene.add(ship);

const cramTurrets = CRAM_MUZZLES.map((p) => {
  const g = makeCramTurret();
  g.position.copy(p);
  scene.add(g);
  return { mesh: g, muzzle: p.clone(), base: p.clone(), fireT: 0 };
});

const laserTurrets = LASER_MUZZLES.map((p) => {
  const { mesh, beam } = makeLaserTurret();
  mesh.position.copy(p);
  scene.add(mesh);
  scene.add(beam);
  return { mesh, muzzle: p.clone(), base: p.clone(), beam };
});

// ---------- entities ----------
const enemies = [],
  eProjectiles = [],
  cramShots = [],
  interceptors = [],
  guardDrones = [],
  debris = [],
  tracers = [];

function ringSpawn(a0, a1) {
  const a = rand(0, TAU),
    r = CFG.spawnR;
  return V(Math.cos(a) * r, rand(a0, a1), Math.sin(a) * r);
}
function addEnemy(type) {
  let e;
  if (type === 'drone')
    e = {
      type,
      group: makeDrone(),
      pos: ringSpawn(70, 180),
      vel: V(),
      hp: 30,
      r: 4,
      orbit: rand(45, 120),
      swirl: rand(35, 72) * (Math.random() < 0.5 ? -1 : 1),
      alt: rand(28, 78),
      wPhase: rand(0, TAU),
      wFreq: rand(1.4, 3.4),
      bob: rand(6, 20),
      breathe: rand(14, 34),
    };
  else if (type === 'missile')
    e = {
      type,
      group: makeMissile(),
      pos: ringSpawn(50, 140),
      vel: V(),
      hp: 18,
      r: 5,
      dmg: 26,
      speed: rand(90, 130),
    };
  else {
    const p = ringSpawn(0, 0);
    p.y = 0;
    e = {
      type,
      group: makeBoat(),
      pos: p,
      vel: V(),
      hp: 90,
      r: 9,
      fireCd: rand(1.5, 3),
      standoff: rand(150, 220),
    };
  }
  e.group.position.copy(e.pos);
  scene.add(e.group);
  enemies.push(e);
}

const wave = { n: 0, queue: [], spawnT: 0, intermission: 3, between: true };
function buildWave(n) {
  const q = [];
  const d = 18 + Math.floor(n * 6),
    m = 3 + Math.floor(n * 2),
    b = Math.floor(n * 0.5);
  for (let i = 0; i < d; i++) q.push('drone');
  for (let i = 0; i < m; i++) q.push('missile');
  for (let i = 0; i < b; i++) q.push('boat');
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  return q;
}

const dGeo = new THREE.TetrahedronGeometry(1.4, 0);
function boom(pos, color, count = 10, power = 60) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(dGeo, color ? flat(color) : M.debris);
    m.position.copy(pos);
    scene.add(m);
    const dir = V(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize();
    debris.push({
      m,
      vel: dir.multiplyScalar(rand(0.4, 1) * power),
      spin: V(rand(-8, 8), rand(-8, 8), rand(-8, 8)),
      life: rand(0.6, 1.2),
    });
  }
}

// ---------- player state ----------
const P = {
  hp: CFG.ship.hp,
  interAmmo: CFG.interceptor.max,
  interRegen: 0,
  droneAmmo: CFG.drone.max,
  droneRegen: 0,
  score: 0,
  alive: false,
};

// ---------- input (buttons only; CRAM & lasers are autonomous) ----------
addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') launchInterceptor();
  if (e.code === 'Digit2') deployDrone();
  if (e.code === 'KeyR') {
    restart();
    P.alive = true;
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    move.left = true;
    e.preventDefault();
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    move.right = true;
    e.preventDefault();
  }
});
addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') move.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') move.right = false;
});
function holdBtn(id, on) {
  const el = document.getElementById(id);
  const d = (e) => {
    e.preventDefault();
    on(true);
  };
  const u = (e) => {
    e.preventDefault();
    on(false);
  };
  el.addEventListener('touchstart', d, { passive: false });
  el.addEventListener('touchend', u);
  el.addEventListener('touchcancel', u);
  el.addEventListener('mousedown', d);
  el.addEventListener('mouseup', u);
  el.addEventListener('mouseleave', u);
}
holdBtn('btnLeft', (v) => (move.left = v));
holdBtn('btnRight', (v) => (move.right = v));

function bindBtn(id, fn) {
  const el = document.getElementById(id);
  const h = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  el.addEventListener('touchstart', h, { passive: false });
  el.addEventListener('mousedown', h);
}
bindBtn('btnInter', () => launchInterceptor());
bindBtn('btnDrone', () => deployDrone());
bindBtn('btnReset', () => {
  restart();
  P.alive = true;
});

// start / restart
const startEl = document.getElementById('start'),
  overEl = document.getElementById('over');
function startGame() {
  startEl.style.display = 'none';
  overEl.style.display = 'none';
  P.alive = true;
}
startEl.addEventListener('click', startGame);
overEl.addEventListener('click', () => {
  restart();
  startGame();
});

// ---------- friendlies ----------
function nearest(type, from, maxD) {
  let best = null,
    bd = maxD || Infinity;
  for (const e of enemies) {
    if (type && e.type !== type) continue;
    if (e.disabled) continue;
    const dd = e.pos.distanceTo(from);
    if (dd < bd) {
      bd = dd;
      best = e;
    }
  }
  return best;
}

function launchInterceptor() {
  if (!P.alive || P.interAmmo < 1) return;
  const tgt = nearest('missile', SHIP_POS);
  if (!tgt) return;
  P.interAmmo--;
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 5, 6), M.inter);
  b.rotation.x = Math.PI / 2;
  g.add(b);
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 6), M.inter);
  n.rotation.x = Math.PI / 2;
  n.position.z = 3.5;
  g.add(n);
  const pos = SHIP_POS.clone().add(V(rand(-4, 4), 10, rand(-4, 4)));
  g.position.copy(pos);
  scene.add(g);
  interceptors.push({
    g,
    pos,
    vel: tgt.pos.clone().sub(pos).normalize().multiplyScalar(CFG.interceptor.speed),
    target: tgt,
    life: 0,
  });
}

function deployDrone() {
  if (!P.alive || P.droneAmmo < 1) return;
  P.droneAmmo--;
  const g = makeDrone();
  g.children.forEach((c) => {
    if (c.material && c.material.color && c !== g.children[3]) c.material = M.dGreen;
  });
  const a = rand(0, TAU),
    pos = SHIP_POS.clone().add(V(Math.cos(a) * 30, 24, Math.sin(a) * 30));
  g.position.copy(pos);
  scene.add(g);
  guardDrones.push({ g, pos, vel: V(), orbitA: a, life: CFG.drone.life, fireCd: 0 });
}

// ---------- auto CRAM turrets (rapid-fire, lead the target) ----------
function updateCRAM(dt) {
  if (!P.alive) return;
  for (const ct of cramTurrets) {
    const tgt = nearest(null, ct.muzzle, CFG.cram.range);
    if (!tgt) {
      ct.fireT = 0;
      continue;
    }
    const lead = ct.muzzle.distanceTo(tgt.pos) / CFG.cram.speed;
    const aim = tgt.pos.clone().addScaledVector(tgt.vel, lead);
    const dir = aim.sub(ct.muzzle).normalize();
    ct.mesh.lookAt(ct.muzzle.clone().add(dir));
    ct.fireT -= dt;
    while (ct.fireT <= 0) {
      ct.fireT += CFG.cram.fireCd;
      const spread = 0.01,
        vd = dir
          .clone()
          .add(V(rand(-spread, spread), rand(-spread, spread), rand(-spread, spread)))
          .normalize();
      const m = new THREE.Mesh(new THREE.SphereGeometry(CFG.cram.r, 5, 4), M.cramRound);
      m.position.copy(ct.muzzle);
      scene.add(m);
      cramShots.push({
        m,
        pos: ct.muzzle.clone(),
        vel: vd.multiplyScalar(CFG.cram.speed),
        life: CFG.cram.life,
      });
    }
  }
}
function updateCramShots(dt) {
  for (let i = cramShots.length - 1; i >= 0; i--) {
    const s = cramShots[i];
    s.pos.addScaledVector(s.vel, dt);
    s.m.position.copy(s.pos);
    s.life -= dt;
    let hit = false;
    for (const e of enemies) {
      if (e.disabled) continue;
      if (s.pos.distanceTo(e.pos) < e.r + CFG.cram.r) {
        e.hp -= CFG.cram.dmg;
        if (e.hp <= 0) killEnemy(e, 0xffe066, 60);
        hit = true;
        break;
      }
    }
    if (hit || s.life <= 0 || s.pos.y < -4) {
      scene.remove(s.m);
      cramShots.splice(i, 1);
    }
  }
}

// ---------- auto laser turrets ----------
function updateLaserTurrets(dt) {
  for (const lt of laserTurrets) {
    const tgt = P.alive ? nearest(null, lt.muzzle, CFG.laserT.range) : null;
    if (tgt) {
      lt.mesh.lookAt(tgt.pos);
      lt.beam.visible = true;
      lt.beam.position.copy(lt.muzzle);
      lt.beam.lookAt(tgt.pos);
      lt.beam.scale.set(1, 1, lt.muzzle.distanceTo(tgt.pos));
      tgt.hp -= CFG.laserT.dps * dt;
      if (tgt.hp <= 0) killEnemy(tgt, 0x33ddff, 60);
    } else lt.beam.visible = false;
  }
}

// ---------- enemies ----------
function killEnemy(e, color, power) {
  const i = enemies.indexOf(e);
  if (i < 0) return;
  boom(e.pos, color, e.type === 'boat' ? 18 : 12, power);
  scene.remove(e.group);
  enemies.splice(i, 1);
  P.score += e.type === 'boat' ? 50 : e.type === 'missile' ? 20 : 15;
}

function enemyShot(pos, dir, speed, dmg) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), M.shell);
  m.position.copy(pos);
  scene.add(m);
  eProjectiles.push({ m, pos: pos.clone(), vel: dir.clone().multiplyScalar(speed), dmg, life: 6 });
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.disabled) {
      e.vel.y -= 120 * dt;
      e.pos.addScaledVector(e.vel, dt);
      e.group.rotation.x += dt * 2;
      e.group.position.copy(e.pos);
      if (e.pos.y < -10) {
        scene.remove(e.group);
        enemies.splice(i, 1);
      }
      continue;
    }
    const toShip = SHIP_POS.clone().sub(e.pos),
      dist = toShip.length();
    toShip.normalize();
    if (e.type === 'drone') {
      e.wPhase += e.wFreq * dt;
      e.orbit = Math.max(0, e.orbit - 26 * dt); // spiral inward for the kamikaze run
      const off = e.pos.clone().sub(SHIP_POS);
      const hd = Math.hypot(off.x, off.z) || 1;
      const rdir = V(off.x / hd, 0, off.z / hd);
      const rerr = clamp(e.orbit + Math.sin(e.wPhase) * e.breathe - hd, -160, 160); // breathing radius -> spiral in/out
      const tang = V(-rdir.z, 0, rdir.x).multiplyScalar(e.swirl); // circle the ship
      const near = clamp(hd / 140, 0, 1);
      const targetY = SHIP_POS.y + e.alt * near + Math.sin(e.wPhase * 1.7 + 1) * e.bob * near; // dive: altitude collapses as it closes
      const sep = V();
      for (const o of enemies) {
        if (o === e || o.type !== 'drone') continue;
        const d2 = e.pos.distanceTo(o.pos);
        if (d2 < 20) sep.add(e.pos.clone().sub(o.pos).setLength(20 - d2));
      }
      const desired = V(
        rdir.x * rerr * 1.3 + tang.x,
        (targetY - e.pos.y) * 1.6,
        rdir.z * rerr * 1.3 + tang.z
      ).add(sep.multiplyScalar(3.5));
      e.vel.lerp(desired, 0.09);
      e.pos.addScaledVector(e.vel, dt);
      e.group.position.copy(e.pos);
      e.group.lookAt(e.pos.clone().add(e.vel));
      e.group.rotation.z += dt * 8;
      if (e.pos.distanceTo(SHIP_POS) < CFG.kamikaze.prox) {
        damageShip(CFG.kamikaze.dmg);
        boom(e.pos, 0xe74c3c, 10, 70);
        scene.remove(e.group);
        enemies.splice(i, 1);
        continue;
      }
    } else if (e.type === 'missile') {
      e.vel.lerp(toShip.clone().multiplyScalar(e.speed), 0.05);
      e.pos.addScaledVector(e.vel, dt);
      e.group.position.copy(e.pos);
      e.group.lookAt(e.pos.clone().add(e.vel));
      if (dist < CFG.ship.r + 4) {
        damageShip(e.dmg);
        boom(e.pos, 0xe74c3c, 14, 90);
        scene.remove(e.group);
        enemies.splice(i, 1);
      }
    } else {
      const f = V(toShip.x, 0, toShip.z).normalize();
      if (dist > e.standoff) e.pos.addScaledVector(f, 40 * dt);
      else e.pos.addScaledVector(V(-f.z, 0, f.x), 22 * dt);
      e.pos.y = 0;
      e.group.position.copy(e.pos);
      e.group.rotation.y = Math.atan2(f.x, f.z);
      e.group.rotation.z = Math.sin(performance.now() * 0.002 + e.pos.x) * 0.05;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && dist < e.standoff + 60) {
        e.fireCd = rand(2, 3.4);
        const mu = e.pos.clone().add(V(0, 6, 0));
        enemyShot(mu, SHIP_POS.clone().sub(mu).normalize(), 170, 14);
      }
    }
  }
}
function updateEProjectiles(dt) {
  for (let i = eProjectiles.length - 1; i >= 0; i--) {
    const p = eProjectiles[i];
    p.pos.addScaledVector(p.vel, dt);
    p.m.position.copy(p.pos);
    p.life -= dt;
    if (p.pos.distanceTo(SHIP_POS) < CFG.ship.r) {
      damageShip(p.dmg);
      boom(p.pos, 0xf39c12, 6, 40);
      scene.remove(p.m);
      eProjectiles.splice(i, 1);
      continue;
    }
    if (p.life <= 0 || p.pos.y < -4) {
      scene.remove(p.m);
      eProjectiles.splice(i, 1);
    }
  }
}

function updateInterceptors(dt) {
  for (let i = interceptors.length - 1; i >= 0; i--) {
    const it = interceptors[i];
    if (!it.target || enemies.indexOf(it.target) < 0) it.target = nearest('missile', it.pos);
    if (it.target)
      it.vel.lerp(
        it.target.pos.clone().sub(it.pos).normalize().multiplyScalar(CFG.interceptor.speed),
        CFG.interceptor.turn * dt
      );
    it.pos.addScaledVector(it.vel, dt);
    it.g.position.copy(it.pos);
    it.g.lookAt(it.pos.clone().add(it.vel));
    it.life += dt;
    if (it.target && it.pos.distanceTo(it.target.pos) < CFG.interceptor.kill) {
      killEnemy(it.target, 0xf1c40f, 80);
      scene.remove(it.g);
      interceptors.splice(i, 1);
      continue;
    }
    if (it.life > 5 || it.pos.length() > 900) {
      scene.remove(it.g);
      interceptors.splice(i, 1);
    }
  }
}

function tracer(a, b, color) {
  const g = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
  scene.add(l);
  tracers.push({ l, life: 0.08 });
}
function updateTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    tracers[i].life -= dt;
    if (tracers[i].life <= 0) {
      scene.remove(tracers[i].l);
      tracers.splice(i, 1);
    }
  }
}

function updateGuardDrones(dt) {
  for (let i = guardDrones.length - 1; i >= 0; i--) {
    const gd = guardDrones[i];
    gd.life -= dt;
    gd.orbitA += dt * 1.4;
    const orbit = SHIP_POS.clone().add(
      V(Math.cos(gd.orbitA) * 60, 26 + Math.sin(gd.orbitA * 2) * 6, Math.sin(gd.orbitA) * 60)
    );
    const tgt = nearest('drone', gd.pos);
    let goal = orbit;
    if (tgt && tgt.pos.distanceTo(gd.pos) < CFG.drone.range * 1.6) goal = tgt.pos.clone().add(V(0, 8, 0));
    gd.vel.lerp(goal.sub(gd.pos).clampLength(0, CFG.drone.speed), 0.06);
    gd.pos.addScaledVector(gd.vel, dt);
    gd.g.position.copy(gd.pos);
    if (tgt) gd.g.lookAt(tgt.pos);
    gd.g.rotation.z += dt * 6;
    gd.fireCd -= dt;
    if (tgt && gd.fireCd <= 0 && gd.pos.distanceTo(tgt.pos) < CFG.drone.range) {
      gd.fireCd = CFG.drone.fireCd;
      tracer(gd.pos, tgt.pos, 0x2ecc71);
      tgt.hp -= CFG.drone.dmg;
      if (tgt.hp <= 0) killEnemy(tgt, 0x2ecc71, 50);
    }
    if (gd.life <= 0) {
      boom(gd.pos, 0x2ecc71, 6, 30);
      scene.remove(gd.g);
      guardDrones.splice(i, 1);
    }
  }
}

function updateDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.vel.y -= 120 * dt;
    d.m.position.addScaledVector(d.vel, dt);
    d.m.rotation.x += d.spin.x * dt;
    d.m.rotation.y += d.spin.y * dt;
    d.life -= dt;
    if (d.life <= 0) {
      scene.remove(d.m);
      debris.splice(i, 1);
    }
  }
}

function damageShip(n) {
  if (!P.alive) return;
  P.hp -= n;
  if (P.hp <= 0) {
    P.hp = 0;
    gameOver();
  }
}

function updateWaves(dt) {
  if (wave.between) {
    wave.spawnT -= dt;
    if (wave.spawnT <= 0) {
      wave.n++;
      wave.queue = buildWave(wave.n);
      wave.between = false;
      wave.spawnT = 0;
    }
    return;
  }
  if (wave.queue.length) {
    wave.spawnT -= dt;
    if (wave.spawnT <= 0) {
      addEnemy(wave.queue.pop());
      wave.spawnT = rand(0.07, 0.2);
    }
  } else if (enemies.length === 0) {
    wave.between = true;
    wave.spawnT = wave.intermission;
  }
}
function updateRegen(dt) {
  if (P.interAmmo < CFG.interceptor.max) {
    P.interRegen += dt;
    if (P.interRegen >= CFG.interceptor.regen) {
      P.interRegen = 0;
      P.interAmmo++;
    }
  }
  if (P.droneAmmo < CFG.drone.max) {
    P.droneRegen += dt;
    if (P.droneRegen >= CFG.drone.regen) {
      P.droneRegen = 0;
      P.droneAmmo++;
    }
  }
}

// ---------- vessel motion illusion (bob + wake + parallax scenery) ----------
const SHIP_SPEED = 55;
const wakeGeo = new THREE.CircleGeometry(2.4, 7);
wakeGeo.rotateX(-Math.PI / 2);
const wakeMat = new THREE.MeshBasicMaterial({
  color: 0xdff1fb,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const wake = [];
let wakeT = 0;
function updateMotion(dt, t) {
  if (P.alive) {
    if (move.left) shipX -= LAT_SPEED * dt;
    if (move.right) shipX += LAT_SPEED * dt;
    shipX = clamp(shipX, -LANE_MAX, LANE_MAX);
  }
  SHIP_POS.x = shipX;
  const heave = Math.sin(t * 0.7) * 1.3,
    roll = Math.sin(t * 0.5) * 0.03,
    pitch = Math.sin(t * 0.9 + 1) * 0.02;
  ship.position.set(shipX, heave, 0);
  ship.rotation.x = pitch;
  ship.rotation.z = roll;
  for (const ct of cramTurrets) {
    ct.mesh.position.set(ct.base.x + shipX, ct.base.y + heave, ct.base.z);
    ct.muzzle.set(ct.base.x + shipX, ct.base.y + heave, ct.base.z);
  }
  for (const lt of laserTurrets) {
    lt.mesh.position.set(lt.base.x + shipX, lt.base.y + heave, lt.base.z);
    lt.muzzle.set(lt.base.x + shipX, lt.base.y + heave, lt.base.z);
  }
  for (const isl of islands) {
    isl.position.z += SHIP_SPEED * dt;
    if (isl.position.z > 720) {
      isl.position.z -= 1680;
      isl.position.x = rand(-820, 820);
    }
  }
  wakeT -= dt;
  while (wakeT <= 0) {
    wakeT += 0.045;
    const side = rand(-7, 7);
    const m = new THREE.Mesh(wakeGeo, wakeMat);
    m.position.set(shipX + side, 2.2, 30);
    scene.add(m);
    wake.push({ m, vel: V(side * 0.25 + rand(-2, 2), 0, SHIP_SPEED * rand(0.8, 1.1)), life: 1.6 });
  }
  for (let i = wake.length - 1; i >= 0; i--) {
    const w = wake[i];
    w.life -= dt;
    w.m.position.addScaledVector(w.vel, dt);
    const s = clamp(w.life / 1.6, 0, 1);
    w.m.scale.setScalar(0.3 + s * 1.9);
    w.m.position.y = 2.2 + Math.sin(t * 3 + i) * 0.3;
    if (w.life <= 0) {
      scene.remove(w.m);
      wake.splice(i, 1);
    }
  }
}

// ---------- naval mines (dodge left / center / right) ----------
const mines = [];
let mineT = 2.5;
function updateMines(dt, t) {
  if (P.alive) {
    mineT -= dt;
    if (mineT <= 0) {
      mineT = rand(CFG.mine.spawn[0], CFG.mine.spawn[1]);
      const lane = [-LANE, 0, LANE][Math.floor(rand(0, 3))];
      const x = lane + rand(-6, 6);
      const g = makeMine();
      g.position.set(x, 0, -400);
      scene.add(g);
      mines.push({ g, x, z: -400, phase: rand(0, TAU) });
    }
  }
  for (let i = mines.length - 1; i >= 0; i--) {
    const mn = mines[i];
    mn.z += SHIP_SPEED * dt;
    mn.g.position.z = mn.z;
    mn.g.position.y = Math.sin(t * 1.5 + mn.phase) * 1.1;
    mn.g.rotation.y += dt * 0.5;
    mn.g.userData.lite.scale.setScalar(0.8 + Math.max(0, Math.sin(t * 6 + mn.phase)) * 0.9);
    if (P.alive && Math.hypot(mn.x - SHIP_POS.x, mn.z - SHIP_POS.z) < CFG.mine.hitR) {
      damageShip(CFG.mine.dmg);
      boom(mn.g.position, 0xff6600, 16, 95);
      scene.remove(mn.g);
      mines.splice(i, 1);
      continue;
    }
    if (mn.z > 740) {
      scene.remove(mn.g);
      mines.splice(i, 1);
    }
  }
}

// ---------- HUD ----------
const hpFill = document.getElementById('hpFill'),
  ammoEl = document.getElementById('ammo'),
  statsEl = document.getElementById('stats');
function updateHUD() {
  hpFill.style.width = (P.hp / CFG.ship.hp) * 100 + '%';
  ammoEl.innerHTML =
    `<span class="k">[1]</span> Missiles <span class="${P.interAmmo < 2 ? 'lo' : ''}">${P.interAmmo}/${CFG.interceptor.max}</span><br>` +
    `<span class="k">[2]</span> Drones <span class="${P.droneAmmo < 1 ? 'lo' : ''}">${P.droneAmmo}/${CFG.drone.max}</span><br>` +
    `CRAM <span class="inf">AUTO</span> &nbsp; Lasers <span class="inf">AUTO</span>`;
  statsEl.innerHTML =
    `<b>${wave.between ? 'NEXT WAVE ' + Math.ceil(wave.spawnT) : 'WAVE ' + wave.n}</b><br>` +
    `Threats: ${enemies.length}<br>Score: ${P.score}`;
}

// ---------- state ----------
function gameOver() {
  P.alive = false;
  laserTurrets.forEach((l) => (l.beam.visible = false));
  document.getElementById('overScore').textContent = `Reached Wave ${wave.n} · Score ${P.score}`;
  overEl.style.display = 'flex';
  showLeaderboard({ score: P.score, wave: wave.n });
}
function restart() {
  [...enemies].forEach((e) => scene.remove(e.group));
  enemies.length = 0;
  [...eProjectiles].forEach((p) => scene.remove(p.m));
  eProjectiles.length = 0;
  [...cramShots].forEach((s) => scene.remove(s.m));
  cramShots.length = 0;
  [...interceptors].forEach((it) => scene.remove(it.g));
  interceptors.length = 0;
  [...guardDrones].forEach((g) => scene.remove(g.g));
  guardDrones.length = 0;
  [...debris].forEach((d) => scene.remove(d.m));
  debris.length = 0;
  [...tracers].forEach((t) => scene.remove(t.l));
  tracers.length = 0;
  laserTurrets.forEach((l) => (l.beam.visible = false));
  Object.assign(P, {
    hp: CFG.ship.hp,
    interAmmo: CFG.interceptor.max,
    interRegen: 0,
    droneAmmo: CFG.drone.max,
    droneRegen: 0,
    score: 0,
  });
  [...mines].forEach((m) => scene.remove(m.g));
  mines.length = 0;
  shipX = 0;
  move.left = move.right = false;
  wave.n = 0;
  wave.queue.length = 0;
  wave.between = true;
  wave.spawnT = wave.intermission;
}

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05);
  waterMat.uniforms.uTime.value = now * 0.001;
  updateMotion(dt, now * 0.001);
  updateMines(dt, now * 0.001);
  if (P.alive) {
    updateWaves(dt);
    updateEnemies(dt);
    updateEProjectiles(dt);
    updateCRAM(dt);
    updateCramShots(dt);
    updateLaserTurrets(dt);
    updateInterceptors(dt);
    updateGuardDrones(dt);
    updateRegen(dt);
  } else {
    updateLaserTurrets(dt);
  }
  updateTracers(dt);
  updateDebris(dt);
  updateHUD();
  renderer.render(scene, camera);
}

export function startGameLoop() {
  initLeaderboard();
  requestAnimationFrame(loop);
}
