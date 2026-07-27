import * as THREE from 'three';
import { TAU, V, CFG } from './config.js';
import { flat, M } from './materials.js';

// ---------- ship + turrets ----------
export function makeShip() {
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 64), M.hull);
  hull.position.y = 2;
  ship.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(10, 18, 4), M.hull);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 2, 38);
  ship.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 40), M.deck);
  deck.position.y = 7;
  ship.add(deck);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(7, 10, 7), M.deck);
  tower.position.set(0, 12, -16);
  ship.add(tower);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(20.2, 1.4, 64.2), M.accent);
  stripe.position.y = 5;
  ship.add(stripe);
  ship.rotation.y = Math.PI;
  return ship;
}

// auto CRAM turrets (rapid-fire point defense)
export function makeCramTurret() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.9, 2.4, 8), M.cram));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6, 0, TAU, 0, Math.PI / 2), M.cram);
  dome.position.y = 1.1;
  g.add(dome);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 6), M.cram);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 1.1, 3.2);
  g.add(barrel);
  return g;
}

// auto laser turret + its beam mesh
export function makeLaserTurret() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 2.4, 6), M.laserT));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6, 6), M.laserT);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 3;
  g.add(barrel);
  const bg = new THREE.CylinderGeometry(0.3, 0.3, 1, 6);
  bg.translate(0, 0.5, 0);
  bg.rotateX(Math.PI / 2);
  const beam = new THREE.Mesh(
    bg,
    new THREE.MeshBasicMaterial({ color: 0x33ddff, transparent: true, opacity: 0.85 })
  );
  beam.visible = false;
  return { mesh: g, beam };
}

// ---------- enemies ----------
export function makeDrone() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 0), M.drone));
  const arm = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.8), M.drone);
  g.add(arm);
  const arm2 = arm.clone();
  arm2.rotation.y = Math.PI / 2;
  g.add(arm2);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6), M.droneEye);
  eye.position.set(0, 0, 2.2);
  g.add(eye);
  return g;
}

export function makeMissile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 8, 6), M.missile);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 6), M.nose);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 5.5;
  g.add(nose);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 2), M.nose);
    f.position.z = -3;
    f.rotation.z = (i * TAU) / 3;
    f.position.x = Math.cos((i * TAU) / 3) * 1.2;
    f.position.y = Math.sin((i * TAU) / 3) * 1.2;
    g.add(f);
  }
  return g;
}

export function makeBoat() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 18), M.boat);
  hull.position.y = 1.5;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(4, 6, 4), M.boat);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 1.5, 11);
  g.add(bow);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 3, 6), M.boatGun);
  turret.position.y = 5;
  g.add(turret);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 6), M.boatGun);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 5.5, 4);
  g.add(barrel);
  return g;
}

// ---------- naval mines ----------
const mineBody = flat(0x1c2833);
const mineSpike = flat(0x2c3e50);
const mineLite = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
export function makeMine() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(CFG.mine.r, 0), mineBody));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU,
      e2 = ((i % 3) - 1) * 0.7;
    const dir = V(Math.cos(a), e2, Math.sin(a)).normalize();
    const s = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 4), mineSpike);
    s.position.copy(dir.clone().multiplyScalar(CFG.mine.r * 0.9));
    s.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    g.add(s);
  }
  const lite = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), mineLite);
  lite.position.y = CFG.mine.r + 1.4;
  g.add(lite);
  g.userData.lite = lite;
  return g;
}
