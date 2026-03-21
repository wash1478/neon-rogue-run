const canvas = document.getElementById('game'); const ctx = canvas.getContext('2d');
function resizeCanvas(){ const dpr = window.devicePixelRatio || 1; canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px'; canvas.width = Math.floor(window.innerWidth * dpr); canvas.height = Math.floor(window.innerHeight * dpr); ctx.setTransform(dpr,0,0,dpr,0,0); W = window.innerWidth; H = window.innerHeight; }
let W, H; resizeCanvas(); window.addEventListener('resize', resizeCanvas);
// pause on background
let paused=false; document.addEventListener('visibilitychange', ()=>{ paused = document.hidden; });

// wait for user gesture to enable audio and start loop
let started=false; document.getElementById('start-btn').addEventListener('click', ()=>{ started=true; document.getElementById('start-overlay').style.display='none'; try{ const actx = new (window.AudioContext||window.webkitAudioContext)(); actx.resume(); }catch(e){} });

// player bike (arcade physics)
const bike = {x:80,y:H-120,w:48,h:28, vy:0, vx:0, onGround:false, angle:0, speed:3, score:0, airtime:0};
const gravity=0.9;
const keys={left:false,right:false,accel:false,jump:false,trick:false};

// themes
const themes = [{id:'forest', sky:'#7ec8ff', ground:'#2b8a3e'},{id:'beach', sky:'#87e0ff', ground:'#e0c77a'},{id:'manhattan', sky:'#9db8d6', ground:'#6b6b6b'}];
let currentTheme = 0;

// world and obstacles
let worldX=0; const obstacles=[]; const prairieDogs=[]; const ramps=[];

// add theme switch button
const themeBtn = document.createElement('button'); themeBtn.textContent='Theme'; themeBtn.style.position='absolute'; themeBtn.style.left='8px'; themeBtn.style.bottom='8px'; document.body.appendChild(themeBtn);
themeBtn.addEventListener('click', ()=>{ currentTheme = (currentTheme+1)%themes.length; });

// spawn obstacles randomly
function spawnHole(){ const x = W + Math.random()*600 + 200; obstacles.push({x,y:H-40,w:60,h:40,type:'hole'}); }
function spawnPrairie(){ const x=W+Math.random()*500+200; prairieDogs.push({x,y:H-60,w:28,h:28,vx:-2}); }
function spawnRamp(){ const x=W+Math.random()*800+200; ramps.push({x,y:H-70,w:80,h:30}); }
setInterval(()=>{ if(Math.random()<0.5) spawnHole(); if(Math.random()<0.3) spawnPrairie(); if(Math.random()<0.2) spawnRamp(); },1200);

// controls (simple joystick for left/right not implemented fully here yet)
document.getElementById('accel').addEventListener('touchstart',e=>{keys.accel=true}); document.getElementById('accel').addEventListener('touchend',e=>{keys.accel=false});
document.getElementById('jump').addEventListener('click',()=>{ if(bike.onGround){ bike.vy=-16; bike.onGround=false; bike.airtime=0 } });
document.getElementById('trick').addEventListener('click',()=>{ if(!bike.onGround){ bike.trick=true } });

function update(){ // speed
  if(keys.accel) bike.speed = Math.min(12,bike.speed+0.2); else bike.speed = Math.max(3,bike.speed-0.05);
  worldX += bike.speed; bike.score += bike.speed*0.01;
  // physics
  bike.vy += gravity; bike.y += bike.vy; if(bike.y + bike.h > H-40){ const landed = !bike.onGround; bike.y = H-40 - bike.h; bike.vy = 0; bike.onGround=true; if(landed){ // landing logic
      if(bike.airtime>8){ bike.score += Math.floor(bike.airtime*2); }
      if(bike.trick && bike.airtime>12){ bike.score += Math.floor(bike.airtime*5); spawnParticles(bike.x,bike.y,30,'#ff0'); }
      bike.airtime=0; bike.trick=false;
    }
  } else { bike.airtime += 1; }
  // obstacles movement
  obstacles.forEach(o=>{ o.x -= bike.speed });
  prairieDogs.forEach(p=>{ p.x -= bike.speed + 1; if(Math.random()<0.005) p.vx = -3; p.x += p.vx });
  ramps.forEach(r=>r.x -= bike.speed);
  // collisions (holes)
  obstacles.forEach((o,i)=>{ if(o.x + o.w < -200) obstacles.splice(i,1); if(bike.x + bike.w > o.x && bike.x < o.x + o.w && bike.y + bike.h > o.y && bike.y < o.y + o.h){ // hit hole -> crash
    bike.score = Math.max(0,bike.score-10); bike.speed = Math.max(3,bike.speed-4); spawnParticles(bike.x, bike.y,20,'#fff'); }
  });
}

const particles=[]; function spawnParticles(x,y,c,col){ const cap = Math.floor(Math.max(12, c * (window.innerWidth<420?0.5:1))); for(let i=0;i<cap;i++) particles.push({x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-1.5)*6,life:40+Math.random()*30,color:col})}
function updateParticles(){ for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life--; if(p.life<0) particles.splice(i,1);} }

function draw(){ ctx.clearRect(0,0,W,H); // sky ground
 const th = themes[currentTheme]; ctx.fillStyle=th.sky; ctx.fillRect(0,0,W,H); ctx.fillStyle=th.ground; ctx.fillRect(0,H-40,W,40);
 // bike
 ctx.fillStyle='#ff0'; ctx.fillRect(bike.x,bike.y,bike.w,bike.h);
 // obstacles
 obstacles.forEach(o=>{ ctx.fillStyle='#000'; ctx.fillRect(o.x,o.y,o.w,o.h)});
 prairieDogs.forEach(p=>{ ctx.fillStyle='#c48'; ctx.fillRect(p.x,p.y,p.w,p.h)});
 ramps.forEach(r=>{ ctx.fillStyle='#964'; ctx.fillRect(r.x,r.y,r.w,r.h)});
 particles.forEach(p=>{ ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,3,3); });
 document.getElementById('score').textContent = 'Score: '+Math.floor(bike.score);
}

function loop(){ update(); updateParticles(); draw(); requestAnimationFrame(loop) }
loop();
