import * as THREE from 'three';

export function flat(color) {
  return new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 0 });
}

// Shared material palette.
export const M = {
  hull: flat(0x2f3c4c),
  deck: flat(0x7f8c8d),
  accent: flat(0xc0392b),
  drone: flat(0x2c3e50),
  droneEye: flat(0xe74c3c),
  missile: flat(0xe74c3c),
  nose: flat(0xecf0f1),
  boat: flat(0x566573),
  boatGun: flat(0x2c3e50),
  dGreen: flat(0x2ecc71),
  inter: flat(0xf1c40f),
  shell: flat(0xf39c12),
  debris: flat(0xf5b041),
  cram: flat(0x34495e),
  cramRound: flat(0xffe066),
  laserT: flat(0x445566),
};
