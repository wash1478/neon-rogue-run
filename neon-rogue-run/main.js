const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth; let H = canvas.height = innerHeight;
window.addEventListener('resize',()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight});

// simple player
const player = {x:100,y:0,w:32,h:48,vy:0,onGround:false,dir:1,score:0};
const gravity = 0.8;
const keys = {left:false,right:false,jump:false,shoot:false};

// bullets and enemies
const bullets = []; const enemies = [];

function spawnEnemy(){
  enemies.push({x:W+50,y:H-80,w:36,h:36, vx: -2 - Math.random()*2});
}
setInterval(spawnEnemy,2000);

// controls
['left','right','jump','shoot'].forEach(id=>{
  const btn=document.getElementById(id);
  btn.addEventListener('touchstart',e=>{e.preventDefault(); keys[id]=true});
  btn.addEventListener('touchend',e=>{e.preventDefault(); keys[id]=false});
  btn.addEventListener('mousedown',e=>{keys[id]=true});
  btn.addEventListener('mouseup',e=>{keys[id]=false});
});

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
  if(keys.jump && player.onGround){player.vy = -14; player.onGround=false}
  // shoot
  if(keys.shoot){ if(bullets.length<3){bullets.push({x:player.x+player.w/2,y:player.y+20,vx:10*player.dir})} keys.shoot=false }
  // physics
  player.vy += gravity; player.y += player.vy;
  if(player.y + player.h > H-40){player.y = H-40 - player.h; player.vy = 0; player.onGround = true}
  // bullets
  for(let i=bullets.length-1;i>=0;i--){ bullets[i].x += bullets[i].vx; if(bullets[i].x>W+50||bullets[i].x<-50) bullets.splice(i,1)}
  // enemies
  for(let i=enemies.length-1;i>=0;i--){ enemies[i].x += enemies[i].vx; if(enemies[i].x < -100) enemies.splice(i,1)}
  // collisions
  enemies.forEach((e,ei)=>{
    bullets.forEach((b,bi)=>{
      if(b.x>e.x && b.x<e.x+e.w && b.y>e.y && b.y<e.y+e.h){ enemies.splice(ei,1); bullets.splice(bi,1); player.score += 10 }
    })
    // player hit
    if(player.x+player.w>e.x && player.x<e.x+e.w && player.y+player.h>e.y && player.y<e.y+e.h){ player.score = Math.max(0, player.score-20); enemies.splice(ei,1) }
  })
}

function draw(){
  ctx.clearRect(0,0,W,H);
  // ground
  ctx.fillStyle='#052'; ctx.fillRect(0,H-40,W,40);
  // player
  ctx.fillStyle='#0ff'; ctx.fillRect(player.x,player.y,player.w,player.h);
  // bullets
  ctx.fillStyle='#ff5'; bullets.forEach(b=>ctx.fillRect(b.x,b.y,8,4));
  // enemies
  ctx.fillStyle='#f66'; enemies.forEach(e=>ctx.fillRect(e.x,e.y,e.w,e.h));
  // HUD
  document.getElementById('score').textContent = 'Score: '+player.score;
}

function loop(){ update(); draw(); requestAnimationFrame(loop) }
loop();
