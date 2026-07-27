import * as THREE from 'three';
import { CFG, SKY, V } from './config.js';
import { flat } from './materials.js';

// ---------- renderer / scene ----------
const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(SKY);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(SKY, 300, CFG.worldFog);

// steep top-down perspective ("isometric" read, but real diverging rays so drag-aim works)
export const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 4000);
const CAM_EYE = V(0, 660, 465);
camera.position.copy(CAM_EYE);
camera.lookAt(0, 12, 0);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(0.5, 1, 0.3);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xdff1ff, 0x29516b, 0.7));
const SUN_DIR = sun.position.clone().normalize();

export function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- water ----------
const waterGeo = new THREE.PlaneGeometry(4000, 4000, 200, 200);
waterGeo.rotateX(-Math.PI / 2);
export const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uFlow: { value: new THREE.Vector2(3, 55) },
    uLight: { value: SUN_DIR },
    uDeep: { value: new THREE.Color(0x12466b) },
    uShallow: { value: new THREE.Color(0x2e86c1) },
    uFogColor: { value: new THREE.Color(SKY) },
    uFogNear: { value: 300 },
    uFogFar: { value: CFG.worldFog },
  },
  extensions: { derivatives: true },
  vertexShader: `uniform float uTime; uniform vec2 uFlow; varying vec3 vW; varying float vH;
    float w(vec2 p,vec2 d,float f,float s){ return sin(dot(p,d)*f+uTime*s); }
    void main(){ vec3 pos=position; vec2 sp=pos.xz-uFlow*uTime;
      float h=2.4*w(sp,vec2(.8,.2),.018,1.1)+1.6*w(sp,vec2(-.3,.9),.027,1.4)+0.9*w(sp,vec2(.6,-.7),.052,2.0);
      pos.y+=h; vH=h; vec4 wp=modelMatrix*vec4(pos,1.0); vW=wp.xyz;
      gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `precision highp float; uniform vec3 uLight,uDeep,uShallow,uFogColor; uniform float uFogNear,uFogFar;
    varying vec3 vW; varying float vH;
    void main(){ vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));
      float d=max(dot(n,normalize(uLight)),0.0);
      vec3 col=mix(uDeep,uShallow,clamp(vH*0.18+0.5,0.0,1.0)); col*=0.45+0.55*d; col+=pow(d,8.0)*0.25;
      float fog=smoothstep(uFogNear,uFogFar,length(vW.xz));
      gl_FragColor=vec4(mix(col,uFogColor,fog),1.0); }`,
});
scene.add(new THREE.Mesh(waterGeo, waterMat));

// ---------- islands (parallax scenery) ----------
export const islands = [];
function island(x, z, s) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.6, 6, 1), flat(0x4e6e4e));
  b.position.y = s * 0.12;
  g.add(b);
  const p = new THREE.Mesh(new THREE.ConeGeometry(s * 0.5, s * 0.9, 5, 1), flat(0x6d8a55));
  p.position.y = s * 0.45;
  g.add(p);
  g.position.set(x, -2, z);
  scene.add(g);
  islands.push(g);
}
island(-560, -380, 90);
island(610, 140, 70);
island(120, 640, 110);
island(-680, 460, 80);
