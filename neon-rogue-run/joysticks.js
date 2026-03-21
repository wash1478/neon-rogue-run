// dual joystick handler: left for movement (up/down), right for aim (angle)
function makeJoystick(baseId, stickId, onMove){ const base=document.getElementById(baseId); const stick=document.getElementById(stickId); let dragging=false, center={x:0,y:0}, r=36;
  base.addEventListener('touchstart',e=>{ e.preventDefault(); dragging=true; const rect=base.getBoundingClientRect(); center={x:rect.left+rect.width/2, y:rect.top+rect.height/2}; });
  base.addEventListener('touchmove',e=>{ if(!dragging) return; e.preventDefault(); const t=e.touches[0]; let dx=t.clientX-center.x, dy=t.clientY-center.y; const dist=Math.sqrt(dx*dx+dy*dy); if(dist>r){ dx = dx*(r/dist); dy = dy*(r/dist);} stick.style.transform = `translate(${dx}px,${dy}px)`; onMove(dx,dy); });
  base.addEventListener('touchend',e=>{ dragging=false; stick.style.transform='translate(0px,0px)'; onMove(0,0); });
}

// create left joystick (movement)
makeJoystick('joystick-left','stick-left',(dx,dy)=>{ window.neonKeys = window.neonKeys || {}; if(dy<-10){ window.neonKeys.up=true; window.neonKeys.down=false } else if(dy>10){ window.neonKeys.down=true; window.neonKeys.up=false } else { window.neonKeys.up=false; window.neonKeys.down=false } });
// create right joystick (aim)
window.currentAim = {x:1,y:0};
makeJoystick('joystick-right','stick-right',(dx,dy)=>{ // normalize to unit vector
  const mag = Math.sqrt(dx*dx+dy*dy); if(mag<6){ window.currentAim = {x:1,y:0}; return;} window.currentAim = {x:dx/mag,y:dy/mag}; });
