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
// lives
let totalLives = 3;
function remainingLives(){ return Math.max(0, totalLives - 1); }
let gameOver=false; let started=false;
const keys = {up:false,down:false,jump:false,shoot:false};

// start overlay handler
document.getElementById('start-btn').addEventListener('click', ()=>{ started=true; document.getElementById('start-overlay').style.display='none'; try{ audioCtx.resume(); }catch(e){} });

// bullets and enemies
const bullets = []; const enemies = [];

let level = {wave:1, spawnInterval:2000, enemySpeedBase:2, difficulty:'normal'};
const bossImg = new Image(); bossImg.src='assets/boss.svg';
function spawnEnemy(type='grunt'){
  if(type==='grunt'){
    enemies.push({x:W+50,y:H-80,w:36,h:36, vx: - (level.enemySpeedBase + Math.random()*1), hp:1, type:'grunt'});
  } else if(type==='charger'){
    enemies.push({x:W+50,y:H-100,w:44,h:44, vx: - (level.enemySpeedBase+2 + Math.random()*1.5), hp:2, type:'charger'});
  } else if(type==='boss'){
    // tuned boss: higher HP and slower initial entrance; shotInterval configurable
    enemies.push({x:W+300,y:H-200,w:160,h:120, vx:0, hp:160, type:'boss', patternState:0, lastShot:0, entering:true, shotInterval:900});
  }
}
setInterval(()=>{
  // spawn according to wave
  // increase chance of harder enemies as wave grows
  const r=Math.random();
  const t = r < 0.6 ? 'grunt' : (r<0.9? 'charger' : 'grunt');
  spawnEnemy(t);
}, Math.max(600, level.spawnInterval - (level.wave*40)));

// boss spawn every 6 waves
setInterval(()=>{
  if(level.wave>0 && level.wave % 6 === 0 && !enemies.some(e=>e.type==='boss')){
    spawnEnemy('boss');
  }
}, 5000);

const enemyBullets = [];

function updateEnemyBehavior(){
  for(const e of enemies){
    if(e.type==='boss'){
      // entrance: if flagged entering, ease to target x
      if(e.entering){ e.x -= 3; if(e.x <= W-320){ e.entering=false; e.lastShot=Date.now(); }} else {
        // simple sinusoidal vertical bobbing
        e.y += Math.sin(Date.now()/300 + (e.x/100))*0.8;
        // shoot according to configurable interval
        if(Date.now() - (e.lastShot||0) > (e.shotInterval||900)){
          e.lastShot = Date.now();
          // fire five bullets in a spread for boss
          for(let i=-2;i<=2;i++){
            enemyBullets.push({x:e.x+e.w/2, y:e.y+e.h/2, vx:-3 + i*0.6, vy: i*0.3});
          }
        }
      }
    }
  }
}

// joystick handling moved to joysticks.js which sets window.neonKeys and window.currentAim
['jump','shoot'].forEach(id=>{ const btn=document.getElementById(id); btn.addEventListener('touchstart',e=>{e.preventDefault(); keys[id]=true}); btn.addEventListener('touchend',e=>{e.preventDefault(); keys[id]=false}); btn.addEventListener('mousedown',e=>{keys[id]=true}); btn.addEventListener('mouseup',e=>{keys[id]=false}); });

function syncJoystick(){ if(window.neonKeys){ keys.up = !!window.neonKeys.up; keys.down = !!window.neonKeys.down; } }

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
  // movement vertical float via joystick
  syncJoystick(); if(keys.up){ player.y = Math.max(20, player.y - 4) } if(keys.down){ player.y = Math.min(H-80, player.y + 4) }
  if(keys.jump && player.onGround){ player.vy = -14; player.onGround=false; beep(600) }
  // shoot using aim vector
  if(keys.shoot){ const aim = window.currentAim || {x:1,y:0}; const speed = 10; bullets.push({x:player.x+player.w/2, y:player.y+player.h/2, vx: aim.x*speed, vy: aim.y*speed}); beep(950); keys.shoot=false }
  // physics
  player.vy += gravity; player.y += player.vy;
  if(player.y + player.h > H-40){player.y = H-40 - player.h; player.vy = 0; player.onGround = true}
  // bullets
  for(let i=bullets.length-1;i>=0;i--){ bullets[i].x += bullets[i].vx; if(bullets[i].x>W+50||bullets[i].x<-50) bullets.splice(i,1)}
  // enemies
  for(let i=enemies.length-1;i>=0;i--){
    // if boss and entering, slide in; otherwise move normally
    if(enemies[i].type==='boss' && enemies[i].entering){ enemies[i].x -= 2; } else { enemies[i].x += enemies[i].vx; }
    if(enemies[i].x < -200) enemies.splice(i,1)
  }

  // enemy bullets update
  for(let i=enemyBullets.length-1;i>=0;i--){ const eb = enemyBullets[i]; eb.x += eb.vx; eb.y += eb.vy; eb.vy += 0.12; if(eb.x < -50 || eb.x > W+50 || eb.y>H+50) enemyBullets.splice(i,1); }

  // enemy AI
  updateEnemyBehavior();

  // collisions
  for(let ei=enemies.length-1; ei>=0; ei--){ const e = enemies[ei];
    // bullets
    for(let bi=bullets.length-1; bi>=0; bi--){ const b = bullets[bi];
      if(b.x>e.x && b.x<e.x+e.w && b.y>e.y && b.y<e.y+e.h){
        e.hp = (e.hp||1)-1; bullets.splice(bi,1);
        spawnParticles(b.x,b.y,6,'#ffb');
        if(e.hp<=0){ player.score += (e.type==='charger'?20:(e.type==='boss'?500:10)); if(e.type!=='boss') dropPowerup(e.x,e.y); spawnParticles(e.x+e.w/2,e.y+e.h/2,32,'#f66'); beep(400); if(e.type==='boss'){ spawnParticles(e.x+60,e.y+60,80,'#f90'); }
          enemies.splice(ei,1);
        }
      }
    }
    // player hit
    if(player.x+player.w>e.x && player.x<e.x+e.w && player.y+player.h>e.y && player.y<e.y+e.h){
      if(Date.now() > playerState.invulnerableUntil){
        playerState.lives -= 1; playerState.invulnerableUntil = Date.now() + 1200; beep(120);
        // knockback
        player.x = Math.max(20, player.x - 40);
        if(e.type!=='boss') enemies.splice(ei,1);
        // big hit effect
        spawnParticles(player.x+player.w/2, player.y+player.h/2, 30, '#fff');
      }
    }
  }

  // check enemy bullets hitting player
  for(let i=enemyBullets.length-1;i>=0;i--){ const eb=enemyBullets[i];
    if(eb.x>player.x && eb.x<player.x+player.w && eb.y>player.y && eb.y<player.y+player.h){
      if(Date.now() > playerState.invulnerableUntil){ playerState.lives--; playerState.invulnerableUntil = Date.now()+1000; spawnParticles(player.x+player.w/2, player.y+player.h/2, 20, '#fff'); beep(180);
          if(playerState.lives<=0){ gameOver=true; document.getElementById('gameover').style.display='flex'; document.getElementById('final-score').textContent='Final Score: '+Math.floor(player.score); }
      }
      enemyBullets.splice(i,1);
    }
  }
}

// draw updated to show powerups & lives
const particles = [];
function spawnParticles(x,y,count,color){ for(let i=0;i<count;i++){ particles.push({x,y,vx:(Math.random()-0.5)*6, vy:(Math.random()-0.8)*6, life:60+Math.random()*30, color}); } }

function updateParticles(){ for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; if(p.life<=0) particles.splice(i,1); }}

function draw(){
  ctx.clearRect(0,0,W,H);
  // ground
  ctx.fillStyle='#052'; ctx.fillRect(0,H-40,W,40);
  // player
  if(playerImg.complete) ctx.drawImage(playerImg, player.x, player.y, player.w, player.h); else { ctx.fillStyle='#0ff'; ctx.fillRect(player.x,player.y,player.w,player.h)}
  // bullets
  ctx.fillStyle='#ff5'; bullets.forEach(b=>ctx.fillRect(b.x,b.y,8,4));
  // enemy bullets
  ctx.fillStyle='#fda'; enemyBullets.forEach(eb=>ctx.fillRect(eb.x, eb.y, 6, 6));
  // enemies
  enemies.forEach(e=>{ if(e.type==='power'){ ctx.fillStyle='#6f6'; ctx.fillRect(e.x,e.y,e.w,e.h); ctx.fillStyle='#003'; ctx.fillText(e.kind, e.x, e.y-4)} else if(e.type==='boss'){ if(bossImg.complete) ctx.drawImage(bossImg, e.x, e.y, e.w, e.h); else { ctx.fillStyle='#f90'; ctx.fillRect(e.x,e.y,e.w,e.h); ctx.fillStyle='#000'; ctx.fillText('BOSS', e.x+8, e.y+20);} } else if(enemyImg.complete) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h); else { ctx.fillStyle='#f66'; ctx.fillRect(e.x,e.y,e.w,e.h) } });
  // particles
  particles.forEach(p=>{ ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,3,3); });
  // HUD
  document.getElementById('score').textContent = 'Score: '+player.score;
  // lives (show remaining = lives-1)
  ctx.fillStyle='#fff'; ctx.font='16px sans-serif'; ctx.fillText('Lives: '+Math.max(0, playerState.lives-1), 12, 28);
}

function loop(){ update(); updateParticles(); draw(); requestAnimationFrame(loop) }
loop();

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

// register service worker and handle install prompt
let deferredPrompt;
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; const btn = document.createElement('button'); btn.textContent='Install Game'; btn.style.position='absolute'; btn.style.right='12px'; btn.style.top='12px'; btn.onclick = async ()=>{ if(deferredPrompt){ deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; deferredPrompt = null; btn.remove(); } }; document.body.appendChild(btn); });
}

function loop(){ update(); draw(); requestAnimationFrame(loop) }
loop();
