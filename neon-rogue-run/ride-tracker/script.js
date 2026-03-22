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
 const startX=-220; const endX=window.innerWidth+220; let x=startX; bike.style.top='40%'; bike.style.left=x+'px'; // slower: smaller step and larger interval
 const id=setInterval(()=>{ x += 6; bike.style.left = x+'px'; if(x> endX){ clearInterval(id); bike.remove(); } }, 60); }
form.addEventListener('submit', e=>{ e.preventDefault(); const distance=document.getElementById('distance').value; const date=document.getElementById('date').value; const time=document.getElementById('time').value; const rides = JSON.parse(localStorage.getItem('rides')||'[]');
  // try to get geolocation
  if(navigator.geolocation){ navigator.geolocation.getCurrentPosition(pos=>{ rides.unshift({distance,date,time,loc:pos.coords}); localStorage.setItem('rides', JSON.stringify(rides)); load(); animateRide(); form.reset(); showMapIfNeeded(); }, ()=>{ rides.unshift({distance,date,time}); localStorage.setItem('rides', JSON.stringify(rides)); load(); animateRide(); form.reset(); }); } else { rides.unshift({distance,date,time}); localStorage.setItem('rides', JSON.stringify(rides)); load(); animateRide(); form.reset(); }
});
load();

// map integration: show markers for rides with location and simple route drawing
let map, layer, routeLayer, routeMarkers = [], addingRoute=false;
function ensureMap(){ const rides=JSON.parse(localStorage.getItem('rides')||'[]'); const coords = rides.filter(r=>r.loc).map(r=>[r.loc.latitude, r.loc.longitude]); document.getElementById('map').style.display='block'; if(!map){ const start = coords.length? coords[0] : defaultCenter; map = L.map('map').setView(start, 13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map); layer = L.layerGroup().addTo(map); routeLayer = L.layerGroup().addTo(map); }
  layer.clearLayers(); coords.forEach(c=>{ L.marker(c).addTo(layer); }); if(coords.length) map.fitBounds(layer.getBounds(),{padding:[20,20]}); }


function onMapClick(e){ // add a dot and connect to previous
  if(!window.currentPolyline){ window.currentPolyline = L.polyline([], {color:'#f06'}).addTo(routeLayer); }
  const mk = L.marker(e.latlng).addTo(routeLayer); routeMarkers.push(mk);
  const latlngs = window.currentPolyline.getLatLngs(); latlngs.push(e.latlng); window.currentPolyline.setLatLngs(latlngs);
}
function startAddingRoute(){ ensureMap(); addingRoute=true; document.getElementById('finish-route').style.display='inline-block'; document.getElementById('clear-route').style.display='inline-block'; routeMarkers=[]; routeLayer.clearLayers(); // enable click-to-add dots
  map.on('click', onMapClick);
  // also add pointerdown on container as a reliable mobile fallback
  const container = map.getContainer();
  function containerDown(ev){ ev.preventDefault(); const latlng = map.mouseEventToLatLng(ev); onMapClick({latlng}); }
  container.addEventListener('pointerdown', containerDown);
  // store the handler so we can remove it later
  map._containerDownHandler = containerDown;
}
function finishRoute(){ addingRoute=false; map.off('click', onMapClick); if(map && map._containerDownHandler){ map.getContainer().removeEventListener('pointerdown', map._containerDownHandler); delete map._containerDownHandler; }
  const route = (window.currentPolyline ? window.currentPolyline.getLatLngs() : []).map(p=>({lat:p.lat,lng:p.lng})); if(route.length===0){ alert('No route drawn'); return;} const routes = JSON.parse(localStorage.getItem('routes')||'[]'); routes.unshift({route, date:new Date().toISOString()}); localStorage.setItem('routes', JSON.stringify(routes)); document.getElementById('finish-route').style.display='none'; document.getElementById('clear-route').style.display='none'; refreshRoutesList(); alert('Route saved'); }
function clearRoute(){ routeMarkers=[]; routeLayer.clearLayers(); if(window.currentPolyline){ routeLayer.removeLayer(window.currentPolyline); window.currentPolyline=null } }

let drawing=false; let lastPointer=null; let drawRAF=null;
function startDraw(e){ drawing=true; routeLayer.clearLayers(); window.currentPolyline = L.polyline([], {color:'#f06'}).addTo(routeLayer); lastPointer = null;
  const container = map.getContainer();
  function pointerMoveRaw(ev){ lastPointer = ev; }
  function pointerUpRaw(ev){ stopDrawing(); }
  container.addEventListener('pointermove', pointerMoveRaw);
  container.addEventListener('pointerup', pointerUpRaw);
  container.addEventListener('pointercancel', pointerUpRaw);
  // start RAF sampler
  function sample(){ if(!drawing){ return; } if(lastPointer){ try{ const latlng = map.mouseEventToLatLng(lastPointer); if(latlng){ const latlngs = window.currentPolyline.getLatLngs(); latlngs.push(latlng); window.currentPolyline.setLatLngs(latlngs); } }catch(e){} } drawRAF = requestAnimationFrame(sample); }
  sample();
  document.getElementById('draw-indicator').style.display='inline'; document.getElementById('undo-point').style.display='inline-block';
}
function stopDrawing(){ drawing=false; lastPointer=null; if(drawRAF){ cancelAnimationFrame(drawRAF); drawRAF=null; }
  const container = map.getContainer(); container.removeEventListener('pointermove', ()=>{}); container.removeEventListener('pointerup', ()=>{}); container.removeEventListener('pointercancel', ()=>{});
  document.getElementById('draw-indicator').style.display='none'; }

// draw button toggles draw mode and locks zoom
document.getElementById('draw-route').addEventListener('click', ()=>{
  ensureMap(); if(!map) return; map.dragging.disable(); map.touchZoom.disable(); map.scrollWheelZoom.disable(); map.doubleClickZoom.disable();
  const container = map.getContainer();
  function pointerDown(ev){ ev.preventDefault(); if(ev.pointerId) try{ container.setPointerCapture(ev.pointerId); }catch(e){}
    startDraw(ev); container.removeEventListener('pointerdown', pointerDown);
  }
  container.addEventListener('pointerdown', pointerDown);
  document.getElementById('finish-route').style.display='inline-block'; document.getElementById('clear-route').style.display='inline-block';
});

// default map center: Boulder, CO
const defaultCenter = [40.014986, -105.270546];

function showMapIfNeeded(){ ensureMap(); }

// wire up UI buttons
document.getElementById('add-route').addEventListener('click', ()=>{ startAddingRoute(); });
document.getElementById('finish-route').addEventListener('click', ()=>{ finishRoute(); });
document.getElementById('clear-route').addEventListener('click', ()=>{ clearRoute(); });

// route manager: list saved routes and allow view/export
function refreshRoutesList(){ const routes = JSON.parse(localStorage.getItem('routes')||'[]'); const el = document.getElementById('routes-list'); const sel = document.getElementById('route-select'); sel.innerHTML = '<option value="">(none)</option>'; el.innerHTML = '<h3>Saved Routes</h3>' + (routes.length? '' : '<div>(no routes)</div>'); routes.forEach((r,i)=>{ const d = document.createElement('div'); d.className='ride'; const v = document.createElement('button'); v.textContent='View'; v.onclick=()=>{ if(!map){ ensureMap();} const latlngs = r.route.map(p=>[p.lat,p.lng]); const poly = L.polyline(latlngs,{color:'#06f'}).addTo(routeLayer); map.fitBounds(poly.getBounds(),{padding:[20,20]}); setTimeout(()=>{ routeLayer.removeLayer(poly); }, 8000); }; const e = document.createElement('button'); e.textContent='Export GPX'; e.onclick=()=>{ exportGPX(r,i); };
    const del = document.createElement('button'); del.textContent='Delete'; del.onclick=()=>{ if(confirm('Delete route?')){ routes.splice(i,1); localStorage.setItem('routes', JSON.stringify(routes)); refreshRoutesList(); }};
    sel.appendChild(new Option('Route '+(i+1), i));
    d.textContent = `Route ${i+1} — ${new Date(r.date).toLocaleString()}`; d.appendChild(v); d.appendChild(e); d.appendChild(del); el.appendChild(d); }); }


function exportGPX(routeObj, idx){ const points = routeObj.route; const header = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RideTracker">\n<trk><name>Route ${idx+1}</name><trkseg>\n`; const pts = points.map(p=>`<trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`).join('\n'); const footer = `\n</trkseg></trk>\n</gpx>`; const gpx = header + pts + footer; const blob = new Blob([gpx],{type:'application/gpx+xml'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`route-${idx+1}.gpx`; a.click(); URL.revokeObjectURL(url); }

showMapIfNeeded(); refreshRoutesList();

// undo last drawn point
document.getElementById('undo-point').addEventListener('click', ()=>{ if(window.currentPolyline){ const pts = window.currentPolyline.getLatLngs(); pts.pop(); window.currentPolyline.setLatLngs(pts); } });
