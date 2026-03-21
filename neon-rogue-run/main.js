const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth; let H = canvas.height = innerHeight;
window.addEventListener('resize',()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight});

// image assets
const playerImg = new Image(); playerImg.src = 'assets/player.svg';
const enemyImg = new Image(); enemyImg.src = 'assets/enemy.svg';

// audio: simple beep generator
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq, duration=0.08){
  const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
  o.type='sine'; o.frequency.value = freq; g.gain.value = 0.12;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  o.stop(audioCtx.currentTime + duration);
}

// simple player
const player = {x:100,y:0,w:32,h:48,vy:0,onGround:false,dir:1,score:0};
const gravity = 0.8;
const keys = {left:false,right:false,jump:false,shoot:false};

// bullets and enemies
const bullets = []; const enemies = [];

let level = {wave:1, spawnInterval:2000, enemySpeedBase:2, difficulty:'normal'};
function spawnEnemy(type='grunt'){
  if(type==='grunt'){
    enemies.push({x:W+50,y:H-80,w:36,h:36, vx: - (level.enemySpeedBase + Math.random()*1), hp:1, type:'grunt'});
  } else if(type==='charger'){
    enemies.push({x:W+50,y:H-100,w:44,h:44, vx: - (level.enemySpeedBase+2 + Math.random()*1.5), hp:2, type:'charger'});
  }
}
setInterval(()=>{
  // spawn according to wave
  const t = Math.random() < 0.7 ? 'grunt' : 'charger';
  spawnEnemy(t);
}, level.spawnInterval);

// joystick controls
const joyBase = document.getElementById('joystick');
const stick = document.getElementById('stick');
let dragging=false, joyCenter={x:0,y:0}, joyRadius=36;
function resetStick(){ stick.style.transform='translate(0px,0px)'; keys.left=false; keys.right=false }
joyBase.addEventListener('touchstart',e=>{ e.preventDefault(); dragging=true; const r=joyBase.getBoundingClientRect(); joyCenter={x:r.left + r.width/2, y:r.top + r.height/2}; });
joyBase.addEventListener('touchmove',e=>{ if(!dragging) return; e.preventDefault(); const t=e.touches[0]; let dx=t.clientX-joyCenter.x; let dy=t.clientY-joyCenter.y; const dist=Math.sqrt(dx*dx+dy*dy); const max=joyRadius; if(dist>max){ dx=dx*(max/dist); dy=dy*(max/dist); } stick.style.transform=`translate(${dx}px,${dy}px)`; // left/right
 if(dx<-10){ keys.left=true; keys.right=false } else if(dx>10){ keys.right=true; keys.left=false } else { keys.left=false; keys.right=false } });
joyBase.addEventListener('touchend',e=>{ dragging=false; resetStick(); });
// action buttons
['jump','shoot'].forEach(id=>{ const btn=document.getElementById(id); btn.addEventListener('touchstart',e=>{e.preventDefault(); keys[id]=true}); btn.addEventListener('touchend',e=>{e.preventDefault(); keys[id]=false}); btn.addEventListener('mousedown',e=>{keys[id]=true}); btn.addEventListener('mouseup',e=>{keys[id]=false}); });

// player health and powerups
let playerState = {lives:3, invulnerableUntil:0, powerups:{doubleShot:false, speed:false}};
let powerupTimeouts = {};

function grantPowerup(name, seconds){ playerState.powerups[name]=true; clearTimeout(powerupTimeouts[name]); powerupTimeouts[name]=setTimeout(()=>{playerState.powerups[name]=false}, seconds*1000); }

function dropPowerup(x,y){ // small chance on enemy death
  const r=Math.random(); if(r<0.25){ const kind = r<0.1 ? 'health' : (r<0.18?'double':'speed'); enemies.push({x,y,w:18,h:18,type:'power',kind}) }
}

document.getElementById('save').addEventListener('click',saveGame);
document.getElementById('load').addEventListener('click',loadGame);

function saveGame(){
  const state = {player:{x:player.x,y:player.y,score:player.score}, enemies};
  localStorage.setItem('neon_rogue_save', JSON.stringify(state));
  alert('Game saved');
}
function loadGame(){
  const raw = localStorage.getItem('neon_rogue_save');
  if(!raw){alert('No save found');return}
  const s=JSON.parse(raw);
  player.x=s.player.x; player.y=s.player.y; player.score=s.player.score||0;
  enemies.length=0; (s.enemies||[]).forEach(e=>enemies.push(e));
  alert('Loaded');
}

function update(){
  // movement
  if(keys.left){player.x -= 4; player.dir=-1}
  if(keys.right){player.x +=4; player.dir=1}
  if(keys.jump && player.onGround){player.vy = -14; player.onGround=false; beep(600)}
  // shoot
  if(keys.shoot){ if(bullets.length<3){bullets.push({x:player.x+player.w/2,y:player.y+20,vx:10*player.dir}); beep(950)} keys.shoot=false }
  // physics
  player.vy += gravity; player.y += player.vy;
  if(player.y + player.h > H-40){player.y = H-40 - player.h; player.vy = 0; player.onGround = true}
  // bullets
  for(let i=bullets.length-1;i>=0;i--){ bullets[i].x += bullets[i].vx; if(bullets[i].x>W+50||bullets[i].x<-50) bullets.splice(i,1)}
  // enemies
  for(let i=enemies.length-1;i>=0;i--){ enemies[i].x += enemies[i].vx; if(enemies[i].x < -100) enemies.splice(i,1)}
  // collisions
  for(let ei=enemies.length-1; ei>=0; ei--){ const e = enemies[ei];
    // bullets
    for(let bi=bullets.length-1; bi>=0; bi--){ const b = bullets[bi];
      if(b.x>e.x && b.x<e.x+e.w && b.y>e.y && b.y<e.y+e.h){
        e.hp = (e.hp||1)-1; bullets.splice(bi,1);
        if(e.hp<=0){ player.score += (e.type==='charger'?20:10); dropPowerup(e.x,e.y); enemies.splice(ei,1); beep(400) }
      }
    }
    // player hit
    if(player.x+player.w>e.x && player.x<e.x+e.w && player.y+player.h>e.y && player.y<e.y+e.h){
      if(Date.now() > playerState.invulnerableUntil){
        playerState.lives -= 1; playerState.invulnerableUntil = Date.now() + 1200; beep(120);
        // knockback
        player.x = Math.max(20, player.x - 40);
        enemies.splice(ei,1);
      }
    }
  }
}

// draw updated to show powerups & lives
function draw(){
  ctx.clearRect(0,0,W,H);
  // ground
  ctx.fillStyle='#052'; ctx.fillRect(0,H-40,W,40);
  // player
  if(playerImg.complete) ctx.drawImage(playerImg, player.x, player.y, player.w, player.h); else { ctx.fillStyle='#0ff'; ctx.fillRect(player.x,player.y,player.w,player.h)}
  // bullets
  ctx.fillStyle='#ff5'; bullets.forEach(b=>ctx.fillRect(b.x,b.y,8,4));
  // enemies
  enemies.forEach(e=>{ if(e.type==='power'){ ctx.fillStyle='#6f6'; ctx.fillRect(e.x,e.y,e.w,e.h); ctx.fillStyle='#003'; ctx.fillText(e.kind, e.x, e.y-4)} else if(enemyImg.complete) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h); else { ctx.fillStyle='#f66'; ctx.fillRect(e.x,e.y,e.w,e.h) } });
  // HUD
  document.getElementById('score').textContent = 'Score: '+player.score;
  // lives
  ctx.fillStyle='#fff'; ctx.font='16px sans-serif'; ctx.fillText('Lives: '+playerState.lives, 12, 28);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  // ground
  ctx.fillStyle='#052'; ctx.fillRect(0,H-40,W,40);
  // player
  if(playerImg.complete) ctx.drawImage(playerImg, player.x, player.y, player.w, player.h); else { ctx.fillStyle='#0ff'; ctx.fillRect(player.x,player.y,player.w,player.h)}
  // bullets
  ctx.fillStyle='#ff5'; bullets.forEach(b=>ctx.fillRect(b.x,b.y,8,4));
  // enemies
  enemies.forEach(e=>{ if(enemyImg.complete) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h); else { ctx.fillStyle='#f66'; ctx.fillRect(e.x,e.y,e.w,e.h) } })
  // HUD
  document.getElementById('score').textContent = 'Score: '+player.score;
}

// high score utilities
function saveHighScore(name, score){ const list = JSON.parse(localStorage.getItem('neon_highscores')||'[]'); list.push({name,score,date:new Date().toISOString()}); list.sort((a,b)=>b.score-a.score); localStorage.setItem('neon_highscores', JSON.stringify(list.slice(0,10))); }
function showHighScores(){ const list = JSON.parse(localStorage.getItem('neon_highscores')||'[]'); const el = document.getElementById('highscore-list'); el.innerHTML = list.map((s,i)=>`<div>${i+1}. ${s.name} - ${s.score}</div>`).join('') || '<div>(no scores)</div>'; document.getElementById('highscore-modal').style.display='block'; }
function clearHighScores(){ localStorage.removeItem('neon_highscores'); showHighScores(); }

document.getElementById('highscores').addEventListener('click', showHighScores);
document.getElementById('close-scores').addEventListener('click', ()=>document.getElementById('highscore-modal').style.display='none');
document.getElementById('clear-scores').addEventListener('click', clearHighScores);

// export/import
function exportSave(){ const raw = localStorage.getItem('neon_rogue_save')||''; const blob = new Blob([raw],{type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='neon_rogue_save.json'; a.click(); URL.revokeObjectURL(url); }
function importSaveFile(){ const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json'; inp.onchange = e=>{ const f=e.target.files[0]; const r=new FileReader(); r.onload=()=>{ localStorage.setItem('neon_rogue_save', r.result); alert('Imported'); }; r.readAsText(f); }; inp.click(); }

// register service worker
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{}); }

function loop(){ update(); draw(); requestAnimationFrame(loop) }
loop();
