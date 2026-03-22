const form=document.getElementById('ride-form'); const feed=document.getElementById('feed'); const anim=document.getElementById('animation');
function load(){ const data=JSON.parse(localStorage.getItem('rides')||'[]'); feed.innerHTML=''; data.forEach(r=>{ const el=document.createElement('div'); el.className='ride'; el.textContent=`${r.date} ${r.time} — ${r.distance} km`; feed.appendChild(el); }); }
function animateRide(){ const bike=document.createElement('div'); bike.className='bike'; bike.innerHTML=`<svg viewBox="0 0 200 100" width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <g>
    <!-- wheels -->
    <circle cx="50" cy="70" r="18" fill="#222"/>
    <circle cx="150" cy="70" r="18" fill="#222"/>
    <!-- frame -->
    <polyline points="60,60 95,45 135,60" stroke="#663300" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="95" y1="45" x2="95" y2="30" stroke="#663300" stroke-width="6"/>
    <!-- rider (fun frog-ish) -->
    <circle cx="105" cy="30" r="12" fill="#7fbf3f"/>
    <rect x="90" y="36" width="30" height="10" rx="4" fill="#2b6"/>
  </g>
</svg>`;
 anim.appendChild(bike);
 const startX=-220; const endX=window.innerWidth+220; let x=startX; bike.style.top='40%'; bike.style.left=x+'px'; const id=setInterval(()=>{ x += 14; bike.style.left = x+'px'; if(x> endX){ clearInterval(id); bike.remove(); } }, 26); }
form.addEventListener('submit', e=>{ e.preventDefault(); const distance=document.getElementById('distance').value; const date=document.getElementById('date').value; const time=document.getElementById('time').value; const rides = JSON.parse(localStorage.getItem('rides')||'[]');
  // try to get geolocation
  if(navigator.geolocation){ navigator.geolocation.getCurrentPosition(pos=>{ rides.unshift({distance,date,time,loc:pos.coords}); localStorage.setItem('rides', JSON.stringify(rides)); load(); animateRide(); form.reset(); showMapIfNeeded(); }, ()=>{ rides.unshift({distance,date,time}); localStorage.setItem('rides', JSON.stringify(rides)); load(); animateRide(); form.reset(); }); } else { rides.unshift({distance,date,time}); localStorage.setItem('rides', JSON.stringify(rides)); load(); animateRide(); form.reset(); }
});
load();

// map integration: show markers for rides with location
let map, layer;
function showMapIfNeeded(){ const rides=JSON.parse(localStorage.getItem('rides')||'[]'); const coords = rides.filter(r=>r.loc).map(r=>[r.loc.latitude, r.loc.longitude]); if(coords.length===0) return; document.getElementById('map').style.display='block'; if(!map){ map = L.map('map').setView(coords[0], 13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map); layer = L.layerGroup().addTo(map); }
  layer.clearLayers(); coords.forEach(c=>{ L.marker(c).addTo(layer); }); map.fitBounds(layer.getBounds(),{padding:[20,20]}); }

showMapIfNeeded();
