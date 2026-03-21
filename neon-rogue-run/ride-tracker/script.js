const form=document.getElementById('ride-form'); const feed=document.getElementById('feed'); const anim=document.getElementById('animation');
function load(){ const data=JSON.parse(localStorage.getItem('rides')||'[]'); feed.innerHTML=''; data.forEach(r=>{ const el=document.createElement('div'); el.className='ride'; el.textContent=`${r.date} ${r.time} — ${r.distance} km`; feed.appendChild(el); }); }
function animateRide(){ const bike=document.createElement('div'); bike.className='bike'; bike.innerHTML='<svg viewBox="0 0 120 60" width="120" height="60"><rect rx="8" width="120" height="40" y="10" fill="#0ff"/></svg>';
 anim.appendChild(bike);
 const startX=-140; const endX=window.innerWidth+140; let x=startX; bike.style.top='40%'; bike.style.left=x+'px'; const id=setInterval(()=>{ x += 10; bike.style.left = x+'px'; if(x> endX){ clearInterval(id); bike.remove(); } }, 30); }
form.addEventListener('submit', e=>{ e.preventDefault(); const distance=document.getElementById('distance').value; const date=document.getElementById('date').value; const time=document.getElementById('time').value; const rides = JSON.parse(localStorage.getItem('rides')||'[]'); rides.unshift({distance,date,time}); localStorage.setItem('rides', JSON.stringify(rides)); load(); animateRide(); form.reset(); });
load();
