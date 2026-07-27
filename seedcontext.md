<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Low-Poly Naval Defense</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#bfe3f0;font-family:ui-monospace,Menlo,Consolas,monospace;color:#eaf6fb;user-select:none}
  #c{display:block;width:100%;height:100%;touch-action:none}
  #hud{position:fixed;inset:0;pointer-events:none}
  .bar{position:absolute;left:18px;height:14px;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.35);border-radius:2px;overflow:hidden}
  .barfill{height:100%;width:100%;transition:width .08s linear}
  #hpBar{top:18px;width:260px}#hpFill{background:#e74c3c}
  .lbl{position:absolute;left:286px;font-size:12px;line-height:14px;text-shadow:0 1px 2px #000}
  #hpLbl{top:18px}
  #stats{position:absolute;right:18px;top:54px;text-align:right;font-size:13px;text-shadow:0 1px 2px #000;line-height:1.5}
  #stats b{color:#f1c40f}
  #ammo{position:absolute;left:18px;top:44px;font-size:13px;text-shadow:0 1px 2px #000;line-height:1.6}
  #ammo .k{color:#f1c40f}#ammo .lo{color:#e74c3c}#ammo .inf{color:#ffe066}
  .mbtn{position:fixed;pointer-events:auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#eaf6fb;border:2px solid rgba(255,255,255,.5);background:rgba(10,28,40,.5);text-shadow:0 1px 2px #000;-webkit-tap-highlight-color:transparent}
  .mbtn:active{background:rgba(40,70,90,.85)}
  .mbtn small{display:block;font-size:9px;opacity:.75;font-weight:normal}
  #btnInter{right:24px;bottom:120px;width:98px;height:98px;font-size:15px;border-color:#f1c40f}
  #btnDrone{right:130px;bottom:56px;width:74px;height:74px;border-color:#2ecc71}
  #btnReset{right:20px;top:16px;width:60px;height:60px;font-size:12px;border-color:#e74c3c;pointer-events:auto}
  #btnLeft{left:22px;bottom:70px;width:84px;height:84px;font-size:30px;border-color:#eaf6fb}
  #btnRight{left:116px;bottom:70px;width:84px;height:84px;font-size:30px;border-color:#eaf6fb}
  .overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(10,28,40,.82);text-align:center;pointer-events:auto}
  .overlay h1{font-size:34px;margin:0 0 6px;letter-spacing:1px}
  .overlay p{max-width:540px;line-height:1.6;font-size:14px;color:#bcd6e2}
  .overlay .keys{font-size:13px;color:#9fbccb;margin-top:14px;text-align:left}
  .overlay .keys b{color:#f1c40f}
  .overlay .go{font-size:22px;color:#e74c3c;margin:10px 0}
  .hint{color:#7fa9bd;font-size:12px;margin-top:18px}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud">
  <div class="bar" id="hpBar"><div class="barfill" id="hpFill"></div></div>
  <div class="lbl" id="hpLbl">HULL</div>
  <div id="ammo"></div>
  <div id="stats"></div>
</div>

<div class="mbtn" id="btnInter">MISSILE</div>
<div class="mbtn" id="btnDrone">DRONE</div>
<div class="mbtn" id="btnReset">RESET</div>
<div class="mbtn" id="btnLeft">&#9664;</div>
<div class="mbtn" id="btnRight">&#9654;</div>

<div class="overlay" id="start">
  <h1>NAVAL DEFENSE</h1>
  <p>A frigate underway under siege. Steer to dodge naval mines while your turrets hold off swarming drones, missiles, and gun-boats.</p>
  <div class="keys">
    <b>&#9664; &#9654; buttons (or A / D / arrow keys)</b> steer the ship left, center, right to dodge naval mines<br>
    <b>CRAM turrets fire automatically</b> — multiple rapid-fire guns lead and shred the nearest threats<br>
    <b>Laser turrets fire automatically</b> — they pick and burn the nearest threat<br>
    <b>MISSILE</b> button (or <b>1</b>) launches an interceptor at the nearest incoming missile<br>
    <b>DRONE</b> button (or <b>2</b>) deploys an autonomous anti-drone drone<br>
    <span class="hint">Your defenses are autonomous — you command the missiles and drones. RESET restarts anytime.</span>
  </div>
  <p class="hint">Tap or click to begin. Landscape recommended on mobile.</p>
</div>

<div class="overlay" id="over" style="display:none">
  <h1>HULL BREACHED</h1>
  <div class="go" id="overScore"></div>
  <p class="hint">Tap or click to redeploy.</p>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const TAU=Math.PI*2, clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

const CFG={
  spawnR:420, worldFog:900,
  ship:{ hp:100, r:14 },
  kamikaze:{ prox:44, dmg:9 },
  mine:{ r:6, hitR:16, dmg:22, spawn:[1.3,2.6] },
  cram:{ speed:480, fireCd:0.05, dmg:12, r:2.2, life:2.4, range:480 },
  laserT:{ dps:55, range:360 },
  hack:null,
  interceptor:{ max:6, regen:4.0, speed:240, turn:3.4, kill:12 },
  drone:{ max:3, regen:7.0, life:22, speed:70, range:160, fireCd:0.35, dmg:24 },
};
const SHIP_POS=V(0,8,0);                 // what enemies attack / defenses protect
const CRAM_MUZZLES=[V(0,17,12),V(0,16,-14),V(-8,15,-2),V(8,15,-2)];
const LASER_MUZZLES=[V(-7,13,-10),V(7,13,-10)];
const LANE=55, LANE_MAX=74, LAT_SPEED=100; let shipX=0; const move={left:false,right:false};

// ---------- renderer / scene ----------
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const SKY=0xbfe3f0; renderer.setClearColor(SKY);

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(SKY,300,CFG.worldFog);

// steep top-down perspective ("isometric" read, but real diverging rays so drag-aim works)
const camera=new THREE.PerspectiveCamera(48,1,0.5,4000);
const CAM_EYE=V(0,660,465);
camera.position.copy(CAM_EYE); camera.lookAt(0,12,0);

const sun=new THREE.DirectionalLight(0xffffff,1.0); sun.position.set(0.5,1,0.3); scene.add(sun);
scene.add(new THREE.HemisphereLight(0xdff1ff,0x29516b,0.7));
const SUN_DIR=sun.position.clone().normalize();

function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();

// ---------- water ----------
const waterGeo=new THREE.PlaneGeometry(4000,4000,200,200); waterGeo.rotateX(-Math.PI/2);
const waterMat=new THREE.ShaderMaterial({
  uniforms:{ uTime:{value:0}, uFlow:{value:new THREE.Vector2(3,55)}, uLight:{value:SUN_DIR}, uDeep:{value:new THREE.Color(0x12466b)},
    uShallow:{value:new THREE.Color(0x2e86c1)}, uFogColor:{value:new THREE.Color(SKY)}, uFogNear:{value:300}, uFogFar:{value:CFG.worldFog} },
  extensions:{ derivatives:true },
  vertexShader:`uniform float uTime; uniform vec2 uFlow; varying vec3 vW; varying float vH;
    float w(vec2 p,vec2 d,float f,float s){ return sin(dot(p,d)*f+uTime*s); }
    void main(){ vec3 pos=position; vec2 sp=pos.xz-uFlow*uTime;
      float h=2.4*w(sp,vec2(.8,.2),.018,1.1)+1.6*w(sp,vec2(-.3,.9),.027,1.4)+0.9*w(sp,vec2(.6,-.7),.052,2.0);
      pos.y+=h; vH=h; vec4 wp=modelMatrix*vec4(pos,1.0); vW=wp.xyz;
      gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader:`precision highp float; uniform vec3 uLight,uDeep,uShallow,uFogColor; uniform float uFogNear,uFogFar;
    varying vec3 vW; varying float vH;
    void main(){ vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));
      float d=max(dot(n,normalize(uLight)),0.0);
      vec3 col=mix(uDeep,uShallow,clamp(vH*0.18+0.5,0.0,1.0)); col*=0.45+0.55*d; col+=pow(d,8.0)*0.25;
      float fog=smoothstep(uFogNear,uFogFar,length(vW.xz));
      gl_FragColor=vec4(mix(col,uFogColor,fog),1.0); }`
});
scene.add(new THREE.Mesh(waterGeo,waterMat));

function flat(color){ return new THREE.MeshPhongMaterial({color,flatShading:true,shininess:0}); }
const islands=[];
function island(x,z,s){ const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.ConeGeometry(s,s*0.6,6,1),flat(0x4e6e4e)); b.position.y=s*0.12; g.add(b);
  const p=new THREE.Mesh(new THREE.ConeGeometry(s*0.5,s*0.9,5,1),flat(0x6d8a55)); p.position.y=s*0.45; g.add(p);
  g.position.set(x,-2,z); scene.add(g); islands.push(g); }
island(-560,-380,90); island(610,140,70); island(120,640,110); island(-680,460,80);

const M={ hull:flat(0x2f3c4c), deck:flat(0x7f8c8d), accent:flat(0xc0392b),
  drone:flat(0x2c3e50), droneEye:flat(0xe74c3c), missile:flat(0xe74c3c), nose:flat(0xecf0f1),
  boat:flat(0x566573), boatGun:flat(0x2c3e50), dGreen:flat(0x2ecc71), inter:flat(0xf1c40f),
  shell:flat(0xf39c12), debris:flat(0xf5b041), cram:flat(0x34495e), cramRound:flat(0xffe066), laserT:flat(0x445566) };

// ---------- ship + turrets ----------
const ship=new THREE.Group();
(function(){
  const hull=new THREE.Mesh(new THREE.BoxGeometry(20,8,64),M.hull); hull.position.y=2; ship.add(hull);
  const bow=new THREE.Mesh(new THREE.ConeGeometry(10,18,4),M.hull); bow.rotation.x=-Math.PI/2; bow.rotation.y=Math.PI/4; bow.position.set(0,2,38); ship.add(bow);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(16,2,40),M.deck); deck.position.y=7; ship.add(deck);
  const tower=new THREE.Mesh(new THREE.BoxGeometry(7,10,7),M.deck); tower.position.set(0,12,-16); ship.add(tower);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(20.2,1.4,64.2),M.accent); stripe.position.y=5; ship.add(stripe);
})();
scene.add(ship); ship.rotation.y=Math.PI;

// auto CRAM turrets (rapid-fire point defense)
function makeCramTurret(){ const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.9,2.4,8),M.cram));
  const dome=new THREE.Mesh(new THREE.SphereGeometry(2.4,8,6,0,TAU,0,Math.PI/2),M.cram); dome.position.y=1.1; g.add(dome);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,7,6),M.cram); barrel.rotation.x=Math.PI/2; barrel.position.set(0,1.1,3.2); g.add(barrel);
  return g; }
const cramTurrets=CRAM_MUZZLES.map(p=>{ const g=makeCramTurret(); g.position.copy(p); scene.add(g); return { mesh:g, muzzle:p.clone(), base:p.clone(), fireT:0 }; });

// auto laser turrets
const laserTurrets=LASER_MUZZLES.map(p=>{
  const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6,2,2.4,6),M.laserT));
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,6,6),M.laserT); barrel.rotation.x=Math.PI/2; barrel.position.z=3; g.add(barrel);
  g.position.copy(p); scene.add(g);
  const bg=new THREE.CylinderGeometry(0.3,0.3,1,6); bg.translate(0,0.5,0); bg.rotateX(Math.PI/2);
  const beam=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:0x33ddff,transparent:true,opacity:0.85})); beam.visible=false; scene.add(beam);
  return { mesh:g, muzzle:p.clone(), base:p.clone(), beam };
});

// ---------- entities ----------
const enemies=[], eProjectiles=[], cramShots=[], interceptors=[], guardDrones=[], debris=[], tracers=[];

function makeDrone(){ const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.4,0),M.drone));
  const arm=new THREE.Mesh(new THREE.BoxGeometry(8,.5,.8),M.drone); g.add(arm);
  const arm2=arm.clone(); arm2.rotation.y=Math.PI/2; g.add(arm2);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.7,6,6),M.droneEye); eye.position.set(0,0,2.2); g.add(eye); return g; }
function makeMissile(){ const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(1,1,8,6),M.missile); body.rotation.x=Math.PI/2; g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(1,3,6),M.nose); nose.rotation.x=Math.PI/2; nose.position.z=5.5; g.add(nose);
  for(let i=0;i<3;i++){ const f=new THREE.Mesh(new THREE.BoxGeometry(.3,3,2),M.nose); f.position.z=-3; f.rotation.z=i*TAU/3; f.position.x=Math.cos(i*TAU/3)*1.2; f.position.y=Math.sin(i*TAU/3)*1.2; g.add(f);} return g; }
function makeBoat(){ const g=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.BoxGeometry(8,4,18),M.boat); hull.position.y=1.5; g.add(hull);
  const bow=new THREE.Mesh(new THREE.ConeGeometry(4,6,4),M.boat); bow.rotation.x=-Math.PI/2; bow.rotation.y=Math.PI/4; bow.position.set(0,1.5,11); g.add(bow);
  const turret=new THREE.Mesh(new THREE.CylinderGeometry(2,2.4,3,6),M.boatGun); turret.position.y=5; g.add(turret);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,7,6),M.boatGun); barrel.rotation.x=Math.PI/2; barrel.position.set(0,5.5,4); g.add(barrel); return g; }

function ringSpawn(a0,a1){ const a=rand(0,TAU),r=CFG.spawnR; return V(Math.cos(a)*r,rand(a0,a1),Math.sin(a)*r); }
function addEnemy(type){ let e;
  if(type==='drone') e={type,group:makeDrone(),pos:ringSpawn(70,180),vel:V(),hp:30,r:4,
    orbit:rand(45,120), swirl:rand(35,72)*(Math.random()<.5?-1:1), alt:rand(28,78),
    wPhase:rand(0,TAU), wFreq:rand(1.4,3.4), bob:rand(6,20), breathe:rand(14,34)};
  else if(type==='missile') e={type,group:makeMissile(),pos:ringSpawn(50,140),vel:V(),hp:18,r:5,dmg:26,speed:rand(90,130)};
  else { const p=ringSpawn(0,0); p.y=0; e={type,group:makeBoat(),pos:p,vel:V(),hp:90,r:9,fireCd:rand(1.5,3),standoff:rand(150,220)}; }
  e.group.position.copy(e.pos); scene.add(e.group); enemies.push(e); }

const wave={ n:0, queue:[], spawnT:0, intermission:3, between:true };
function buildWave(n){ const q=[]; const d=18+Math.floor(n*6),m=3+Math.floor(n*2),b=Math.floor(n*0.5);
  for(let i=0;i<d;i++)q.push('drone'); for(let i=0;i<m;i++)q.push('missile'); for(let i=0;i<b;i++)q.push('boat');
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];} return q; }

const dGeo=new THREE.TetrahedronGeometry(1.4,0);
function boom(pos,color,count=10,power=60){ for(let i=0;i<count;i++){ const m=new THREE.Mesh(dGeo,color?flat(color):M.debris);
  m.position.copy(pos); scene.add(m); const dir=V(rand(-1,1),rand(-.2,1),rand(-1,1)).normalize();
  debris.push({m,vel:dir.multiplyScalar(rand(.4,1)*power),spin:V(rand(-8,8),rand(-8,8),rand(-8,8)),life:rand(.6,1.2)}); } }

// ---------- player state ----------
const P={ hp:CFG.ship.hp, interAmmo:CFG.interceptor.max, interRegen:0, droneAmmo:CFG.drone.max, droneRegen:0, score:0, alive:false };

// ---------- input (buttons only; CRAM & lasers are autonomous) ----------

addEventListener('keydown',e=>{ if(e.code==='Digit1')launchInterceptor(); if(e.code==='Digit2')deployDrone(); if(e.code==='KeyR'){ restart(); P.alive=true; }
  if(e.code==='ArrowLeft'||e.code==='KeyA'){ move.left=true; e.preventDefault(); } if(e.code==='ArrowRight'||e.code==='KeyD'){ move.right=true; e.preventDefault(); } });
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA')move.left=false; if(e.code==='ArrowRight'||e.code==='KeyD')move.right=false; });
function holdBtn(id,on){ const el=document.getElementById(id);
  const d=e=>{e.preventDefault();on(true);}, u=e=>{e.preventDefault();on(false);};
  el.addEventListener('touchstart',d,{passive:false}); el.addEventListener('touchend',u); el.addEventListener('touchcancel',u);
  el.addEventListener('mousedown',d); el.addEventListener('mouseup',u); el.addEventListener('mouseleave',u); }
holdBtn('btnLeft',v=>move.left=v); holdBtn('btnRight',v=>move.right=v);

function bindBtn(id,fn){ const el=document.getElementById(id);
  const h=e=>{ e.preventDefault(); e.stopPropagation(); fn(); };
  el.addEventListener('touchstart',h,{passive:false}); el.addEventListener('mousedown',h); }
bindBtn('btnInter',()=>launchInterceptor());
bindBtn('btnDrone',()=>deployDrone());
bindBtn('btnReset',()=>{ restart(); P.alive=true; });

// start / restart
const startEl=document.getElementById('start'), overEl=document.getElementById('over');
function startGame(){ startEl.style.display='none'; overEl.style.display='none'; P.alive=true; }
startEl.addEventListener('click',startGame);
overEl.addEventListener('click',()=>{ restart(); startGame(); });

// ---------- friendlies ----------
function nearest(type,from,maxD){ let best=null,bd=maxD||Infinity;
  for(const e of enemies){ if(type&&e.type!==type)continue; if(e.disabled)continue; const dd=e.pos.distanceTo(from); if(dd<bd){bd=dd;best=e;} } return best; }

function launchInterceptor(){ if(!P.alive||P.interAmmo<1)return; const tgt=nearest('missile',SHIP_POS); if(!tgt)return;
  P.interAmmo--; const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,5,6),M.inter); b.rotation.x=Math.PI/2; g.add(b);
  const n=new THREE.Mesh(new THREE.ConeGeometry(.6,2,6),M.inter); n.rotation.x=Math.PI/2; n.position.z=3.5; g.add(n);
  const pos=SHIP_POS.clone().add(V(rand(-4,4),10,rand(-4,4))); g.position.copy(pos); scene.add(g);
  interceptors.push({g,pos,vel:tgt.pos.clone().sub(pos).normalize().multiplyScalar(CFG.interceptor.speed),target:tgt,life:0}); }

function deployDrone(){ if(!P.alive||P.droneAmmo<1)return; P.droneAmmo--;
  const g=makeDrone(); g.children.forEach(c=>{ if(c.material&&c.material.color&&c!==g.children[3]) c.material=M.dGreen; });
  const a=rand(0,TAU), pos=SHIP_POS.clone().add(V(Math.cos(a)*30,24,Math.sin(a)*30)); g.position.copy(pos); scene.add(g);
  guardDrones.push({g,pos,vel:V(),orbitA:a,life:CFG.drone.life,fireCd:0}); }

// ---------- auto CRAM turrets (rapid-fire, lead the target) ----------
function updateCRAM(dt){
  if(!P.alive)return;
  for(const ct of cramTurrets){
    const tgt=nearest(null,ct.muzzle,CFG.cram.range);
    if(!tgt){ ct.fireT=0; continue; }
    const lead=ct.muzzle.distanceTo(tgt.pos)/CFG.cram.speed;
    const aim=tgt.pos.clone().addScaledVector(tgt.vel,lead);
    const dir=aim.sub(ct.muzzle).normalize();
    ct.mesh.lookAt(ct.muzzle.clone().add(dir));
    ct.fireT-=dt;
    while(ct.fireT<=0){ ct.fireT+=CFG.cram.fireCd;
      const spread=0.01, vd=dir.clone().add(V(rand(-spread,spread),rand(-spread,spread),rand(-spread,spread))).normalize();
      const m=new THREE.Mesh(new THREE.SphereGeometry(CFG.cram.r,5,4),M.cramRound); m.position.copy(ct.muzzle); scene.add(m);
      cramShots.push({m,pos:ct.muzzle.clone(),vel:vd.multiplyScalar(CFG.cram.speed),life:CFG.cram.life}); }
  }
}
function updateCramShots(dt){ for(let i=cramShots.length-1;i>=0;i--){ const s=cramShots[i];
  s.pos.addScaledVector(s.vel,dt); s.m.position.copy(s.pos); s.life-=dt;
  let hit=false;
  for(const e of enemies){ if(e.disabled)continue; if(s.pos.distanceTo(e.pos)<e.r+CFG.cram.r){ e.hp-=CFG.cram.dmg; if(e.hp<=0)killEnemy(e,0xffe066,60); hit=true; break; } }
  if(hit||s.life<=0||s.pos.y<-4){ scene.remove(s.m); cramShots.splice(i,1); } } }

// ---------- auto laser turrets ----------
function updateLaserTurrets(dt){
  for(const lt of laserTurrets){
    const tgt = P.alive ? nearest(null,lt.muzzle,CFG.laserT.range) : null;
    if(tgt){ lt.mesh.lookAt(tgt.pos);
      lt.beam.visible=true; lt.beam.position.copy(lt.muzzle); lt.beam.lookAt(tgt.pos); lt.beam.scale.set(1,1,lt.muzzle.distanceTo(tgt.pos));
      tgt.hp-=CFG.laserT.dps*dt; if(tgt.hp<=0)killEnemy(tgt,0x33ddff,60);
    } else lt.beam.visible=false;
  }
}

// ---------- enemies ----------
function killEnemy(e,color,power){ const i=enemies.indexOf(e); if(i<0)return;
  boom(e.pos,color,e.type==='boat'?18:12,power); scene.remove(e.group); enemies.splice(i,1);
  P.score += e.type==='boat'?50:e.type==='missile'?20:15; }

function enemyShot(pos,dir,speed,dmg){ const m=new THREE.Mesh(new THREE.SphereGeometry(1.2,6,6),M.shell);
  m.position.copy(pos); scene.add(m); eProjectiles.push({m,pos:pos.clone(),vel:dir.clone().multiplyScalar(speed),dmg,life:6}); }

function updateEnemies(dt){
  for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i];
    if(e.disabled){ e.vel.y-=120*dt; e.pos.addScaledVector(e.vel,dt); e.group.rotation.x+=dt*2; e.group.position.copy(e.pos);
      if(e.pos.y<-10){ scene.remove(e.group); enemies.splice(i,1);} continue; }
    const toShip=SHIP_POS.clone().sub(e.pos), dist=toShip.length(); toShip.normalize();
    if(e.type==='drone'){
      e.wPhase+=e.wFreq*dt;
      e.orbit=Math.max(0,e.orbit-26*dt);                                  // spiral inward for the kamikaze run
      const off=e.pos.clone().sub(SHIP_POS); const hd=Math.hypot(off.x,off.z)||1;
      const rdir=V(off.x/hd,0,off.z/hd);
      const rerr=clamp(e.orbit+Math.sin(e.wPhase)*e.breathe-hd,-160,160); // breathing radius -> spiral in/out
      const tang=V(-rdir.z,0,rdir.x).multiplyScalar(e.swirl);              // circle the ship
      const near=clamp(hd/140,0,1);
      const targetY=SHIP_POS.y+e.alt*near+Math.sin(e.wPhase*1.7+1)*e.bob*near; // dive: altitude collapses as it closes
      const sep=V(); for(const o of enemies){ if(o===e||o.type!=='drone')continue; const d2=e.pos.distanceTo(o.pos); if(d2<20)sep.add(e.pos.clone().sub(o.pos).setLength(20-d2)); }
      const desired=V(rdir.x*rerr*1.3+tang.x, (targetY-e.pos.y)*1.6, rdir.z*rerr*1.3+tang.z).add(sep.multiplyScalar(3.5));
      e.vel.lerp(desired,0.09); e.pos.addScaledVector(e.vel,dt);
      e.group.position.copy(e.pos); e.group.lookAt(e.pos.clone().add(e.vel)); e.group.rotation.z+=dt*8;
      if(e.pos.distanceTo(SHIP_POS)<CFG.kamikaze.prox){ damageShip(CFG.kamikaze.dmg); boom(e.pos,0xe74c3c,10,70); scene.remove(e.group); enemies.splice(i,1); continue; }
    } else if(e.type==='missile'){
      e.vel.lerp(toShip.clone().multiplyScalar(e.speed),0.05); e.pos.addScaledVector(e.vel,dt);
      e.group.position.copy(e.pos); e.group.lookAt(e.pos.clone().add(e.vel));
      if(dist<CFG.ship.r+4){ damageShip(e.dmg); boom(e.pos,0xe74c3c,14,90); scene.remove(e.group); enemies.splice(i,1); }
    } else {
      const f=V(toShip.x,0,toShip.z).normalize();
      if(dist>e.standoff) e.pos.addScaledVector(f,40*dt); else e.pos.addScaledVector(V(-f.z,0,f.x),22*dt);
      e.pos.y=0; e.group.position.copy(e.pos); e.group.rotation.y=Math.atan2(f.x,f.z); e.group.rotation.z=Math.sin(performance.now()*0.002+e.pos.x)*0.05;
      e.fireCd-=dt; if(e.fireCd<=0&&dist<e.standoff+60){ e.fireCd=rand(2,3.4); const mu=e.pos.clone().add(V(0,6,0)); enemyShot(mu,SHIP_POS.clone().sub(mu).normalize(),170,14); }
    }
  }
}
function updateEProjectiles(dt){ for(let i=eProjectiles.length-1;i>=0;i--){ const p=eProjectiles[i];
  p.pos.addScaledVector(p.vel,dt); p.m.position.copy(p.pos); p.life-=dt;
  if(p.pos.distanceTo(SHIP_POS)<CFG.ship.r){ damageShip(p.dmg); boom(p.pos,0xf39c12,6,40); scene.remove(p.m); eProjectiles.splice(i,1); continue; }
  if(p.life<=0||p.pos.y<-4){ scene.remove(p.m); eProjectiles.splice(i,1); } } }

function updateInterceptors(dt){ for(let i=interceptors.length-1;i>=0;i--){ const it=interceptors[i];
  if(!it.target||enemies.indexOf(it.target)<0) it.target=nearest('missile',it.pos);
  if(it.target) it.vel.lerp(it.target.pos.clone().sub(it.pos).normalize().multiplyScalar(CFG.interceptor.speed),CFG.interceptor.turn*dt);
  it.pos.addScaledVector(it.vel,dt); it.g.position.copy(it.pos); it.g.lookAt(it.pos.clone().add(it.vel)); it.life+=dt;
  if(it.target&&it.pos.distanceTo(it.target.pos)<CFG.interceptor.kill){ killEnemy(it.target,0xf1c40f,80); scene.remove(it.g); interceptors.splice(i,1); continue; }
  if(it.life>5||it.pos.length()>900){ scene.remove(it.g); interceptors.splice(i,1); } } }

function tracer(a,b,color){ const g=new THREE.BufferGeometry().setFromPoints([a.clone(),b.clone()]);
  const l=new THREE.Line(g,new THREE.LineBasicMaterial({color})); scene.add(l); tracers.push({l,life:0.08}); }
function updateTracers(dt){ for(let i=tracers.length-1;i>=0;i--){ tracers[i].life-=dt; if(tracers[i].life<=0){ scene.remove(tracers[i].l); tracers.splice(i,1);} } }

function updateGuardDrones(dt){ for(let i=guardDrones.length-1;i>=0;i--){ const gd=guardDrones[i]; gd.life-=dt; gd.orbitA+=dt*1.4;
  const orbit=SHIP_POS.clone().add(V(Math.cos(gd.orbitA)*60,26+Math.sin(gd.orbitA*2)*6,Math.sin(gd.orbitA)*60));
  const tgt=nearest('drone',gd.pos); let goal=orbit;
  if(tgt&&tgt.pos.distanceTo(gd.pos)<CFG.drone.range*1.6) goal=tgt.pos.clone().add(V(0,8,0));
  gd.vel.lerp(goal.sub(gd.pos).clampLength(0,CFG.drone.speed),0.06); gd.pos.addScaledVector(gd.vel,dt); gd.g.position.copy(gd.pos);
  if(tgt)gd.g.lookAt(tgt.pos); gd.g.rotation.z+=dt*6; gd.fireCd-=dt;
  if(tgt&&gd.fireCd<=0&&gd.pos.distanceTo(tgt.pos)<CFG.drone.range){ gd.fireCd=CFG.drone.fireCd; tracer(gd.pos,tgt.pos,0x2ecc71); tgt.hp-=CFG.drone.dmg; if(tgt.hp<=0)killEnemy(tgt,0x2ecc71,50); }
  if(gd.life<=0){ boom(gd.pos,0x2ecc71,6,30); scene.remove(gd.g); guardDrones.splice(i,1); } } }

function updateDebris(dt){ for(let i=debris.length-1;i>=0;i--){ const d=debris[i]; d.vel.y-=120*dt; d.m.position.addScaledVector(d.vel,dt);
  d.m.rotation.x+=d.spin.x*dt; d.m.rotation.y+=d.spin.y*dt; d.life-=dt; if(d.life<=0){ scene.remove(d.m); debris.splice(i,1);} } }

function damageShip(n){ if(!P.alive)return; P.hp-=n; if(P.hp<=0){ P.hp=0; gameOver(); } }

function updateWaves(dt){
  if(wave.between){ wave.spawnT-=dt; if(wave.spawnT<=0){ wave.n++; wave.queue=buildWave(wave.n); wave.between=false; wave.spawnT=0; } return; }
  if(wave.queue.length){ wave.spawnT-=dt; if(wave.spawnT<=0){ addEnemy(wave.queue.pop()); wave.spawnT=rand(0.07,0.2); } }
  else if(enemies.length===0){ wave.between=true; wave.spawnT=wave.intermission; }
}
function updateRegen(dt){
  if(P.interAmmo<CFG.interceptor.max){ P.interRegen+=dt; if(P.interRegen>=CFG.interceptor.regen){P.interRegen=0;P.interAmmo++;} }
  if(P.droneAmmo<CFG.drone.max){ P.droneRegen+=dt; if(P.droneRegen>=CFG.drone.regen){P.droneRegen=0;P.droneAmmo++;} }
}

// ---------- vessel motion illusion (bob + wake + parallax scenery) ----------
const SHIP_SPEED=55;
const wakeGeo=new THREE.CircleGeometry(2.4,7); wakeGeo.rotateX(-Math.PI/2);
const wakeMat=new THREE.MeshBasicMaterial({color:0xdff1fb,transparent:true,opacity:0.6,depthWrite:false,side:THREE.DoubleSide});
const wake=[]; let wakeT=0;
function updateMotion(dt,t){
  if(P.alive){ if(move.left)shipX-=LAT_SPEED*dt; if(move.right)shipX+=LAT_SPEED*dt; shipX=clamp(shipX,-LANE_MAX,LANE_MAX); }
  SHIP_POS.x=shipX;
  const heave=Math.sin(t*0.7)*1.3, roll=Math.sin(t*0.5)*0.03, pitch=Math.sin(t*0.9+1)*0.02;
  ship.position.set(shipX,heave,0); ship.rotation.x=pitch; ship.rotation.z=roll;
  for(const ct of cramTurrets){ ct.mesh.position.set(ct.base.x+shipX,ct.base.y+heave,ct.base.z); ct.muzzle.set(ct.base.x+shipX,ct.base.y+heave,ct.base.z); }
  for(const lt of laserTurrets){ lt.mesh.position.set(lt.base.x+shipX,lt.base.y+heave,lt.base.z); lt.muzzle.set(lt.base.x+shipX,lt.base.y+heave,lt.base.z); }
  for(const isl of islands){ isl.position.z+=SHIP_SPEED*dt; if(isl.position.z>720){ isl.position.z-=1680; isl.position.x=rand(-820,820); } }
  wakeT-=dt;
  while(wakeT<=0){ wakeT+=0.045; const side=rand(-7,7);
    const m=new THREE.Mesh(wakeGeo,wakeMat); m.position.set(shipX+side,2.2,30); scene.add(m);
    wake.push({m,vel:V(side*0.25+rand(-2,2),0,SHIP_SPEED*rand(0.8,1.1)),life:1.6}); }
  for(let i=wake.length-1;i>=0;i--){ const w=wake[i]; w.life-=dt; w.m.position.addScaledVector(w.vel,dt);
    const s=clamp(w.life/1.6,0,1); w.m.scale.setScalar(0.3+s*1.9); w.m.position.y=2.2+Math.sin(t*3+i)*0.3;
    if(w.life<=0){ scene.remove(w.m); wake.splice(i,1); } }
}

// ---------- naval mines (dodge left / center / right) ----------
const mineBody=flat(0x1c2833), mineSpike=flat(0x2c3e50), mineLite=new THREE.MeshBasicMaterial({color:0xff3b30});
function makeMine(){ const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(CFG.mine.r,0),mineBody));
  for(let i=0;i<9;i++){ const a=i/9*TAU, e2=(i%3-1)*0.7; const dir=V(Math.cos(a),e2,Math.sin(a)).normalize();
    const s=new THREE.Mesh(new THREE.ConeGeometry(1.1,3.4,4),mineSpike);
    s.position.copy(dir.clone().multiplyScalar(CFG.mine.r*0.9)); s.quaternion.setFromUnitVectors(V(0,1,0),dir); g.add(s); }
  const lite=new THREE.Mesh(new THREE.SphereGeometry(1.2,6,6),mineLite); lite.position.y=CFG.mine.r+1.4; g.add(lite); g.userData.lite=lite;
  return g; }
const mines=[]; let mineT=2.5;
function updateMines(dt,t){
  if(P.alive){ mineT-=dt; if(mineT<=0){ mineT=rand(CFG.mine.spawn[0],CFG.mine.spawn[1]);
    const lane=[-LANE,0,LANE][Math.floor(rand(0,3))]; const x=lane+rand(-6,6);
    const g=makeMine(); g.position.set(x,0,-400); scene.add(g); mines.push({g,x,z:-400,phase:rand(0,TAU)}); } }
  for(let i=mines.length-1;i>=0;i--){ const mn=mines[i]; mn.z+=SHIP_SPEED*dt;
    mn.g.position.z=mn.z; mn.g.position.y=Math.sin(t*1.5+mn.phase)*1.1; mn.g.rotation.y+=dt*0.5;
    mn.g.userData.lite.scale.setScalar(0.8+Math.max(0,Math.sin(t*6+mn.phase))*0.9);
    if(P.alive && Math.hypot(mn.x-SHIP_POS.x, mn.z-SHIP_POS.z)<CFG.mine.hitR){ damageShip(CFG.mine.dmg); boom(mn.g.position,0xff6600,16,95); scene.remove(mn.g); mines.splice(i,1); continue; }
    if(mn.z>740){ scene.remove(mn.g); mines.splice(i,1); } }
}

// ---------- HUD ----------
const hpFill=document.getElementById('hpFill'), ammoEl=document.getElementById('ammo'), statsEl=document.getElementById('stats');
function updateHUD(){
  hpFill.style.width=(P.hp/CFG.ship.hp*100)+'%';
  ammoEl.innerHTML=`<span class="k">[1]</span> Missiles <span class="${P.interAmmo<2?'lo':''}">${P.interAmmo}/${CFG.interceptor.max}</span><br>`+
    `<span class="k">[2]</span> Drones <span class="${P.droneAmmo<1?'lo':''}">${P.droneAmmo}/${CFG.drone.max}</span><br>`+
    `CRAM <span class="inf">AUTO</span> &nbsp; Lasers <span class="inf">AUTO</span>`;
  statsEl.innerHTML=`<b>${wave.between?'NEXT WAVE '+Math.ceil(wave.spawnT):'WAVE '+wave.n}</b><br>Threats: ${enemies.length}<br>Score: ${P.score}`;
}

// ---------- state ----------
function gameOver(){ P.alive=false; laserTurrets.forEach(l=>l.beam.visible=false);
  document.getElementById('overScore').textContent=`Reached Wave ${wave.n} · Score ${P.score}`; overEl.style.display='flex'; }
function restart(){
  [...enemies].forEach(e=>scene.remove(e.group)); enemies.length=0;
  [...eProjectiles].forEach(p=>scene.remove(p.m)); eProjectiles.length=0;
  [...cramShots].forEach(s=>scene.remove(s.m)); cramShots.length=0;
  [...interceptors].forEach(it=>scene.remove(it.g)); interceptors.length=0;
  [...guardDrones].forEach(g=>scene.remove(g.g)); guardDrones.length=0;
  [...debris].forEach(d=>scene.remove(d.m)); debris.length=0;
  [...tracers].forEach(t=>scene.remove(t.l)); tracers.length=0;
  laserTurrets.forEach(l=>l.beam.visible=false);
  Object.assign(P,{hp:CFG.ship.hp,interAmmo:CFG.interceptor.max,interRegen:0,droneAmmo:CFG.drone.max,droneRegen:0,score:0});
  [...mines].forEach(m=>scene.remove(m.g)); mines.length=0; shipX=0; move.left=move.right=false;
  wave.n=0; wave.queue.length=0; wave.between=true; wave.spawnT=wave.intermission;
}

// ---------- loop ----------
let last=performance.now();
function loop(now){ requestAnimationFrame(loop);
  let dt=(now-last)/1000; last=now; dt=Math.min(dt,0.05);
  waterMat.uniforms.uTime.value=now*0.001;
  updateMotion(dt,now*0.001);
  updateMines(dt,now*0.001);
  if(P.alive){ updateWaves(dt); updateEnemies(dt); updateEProjectiles(dt);
    updateCRAM(dt); updateCramShots(dt); updateLaserTurrets(dt); updateInterceptors(dt); updateGuardDrones(dt); updateRegen(dt); }
  else { updateLaserTurrets(dt); }
  updateTracers(dt); updateDebris(dt); updateHUD(); renderer.render(scene,camera);
}
requestAnimationFrame(loop);
</script>
</body>
</html>