// simple joystick for up/down
const joyBase = document.getElementById('joystick'); const stick = document.getElementById('stick'); let dragging=false, joyCenter={x:0,y:0}, joyRadius=36;
joyBase.addEventListener('touchstart',e=>{ e.preventDefault(); dragging=true; const r=joyBase.getBoundingClientRect(); joyCenter={x:r.left + r.width/2, y:r.top + r.height/2}; });
joyBase.addEventListener('touchmove',e=>{ if(!dragging) return; e.preventDefault(); const t=e.touches[0]; let dy=t.clientY-joyCenter.y; const max=joyRadius; if(dy<-max) dy=-max; if(dy>max) dy=max; stick.style.transform=`translate(0px,${dy}px)`; if(dy < -10){ keys.up=true; keys.down=false } else if(dy > 10){ keys.down=true; keys.up=false } else { keys.up=false; keys.down=false } });
joyBase.addEventListener('touchend',e=>{ dragging=false; stick.style.transform='translate(0px,0px)'; keys.up=false; keys.down=false; });
// desktop fallback
joyBase.addEventListener('mousedown',e=>{ dragging=true; }); document.addEventListener('mouseup',e=>{ dragging=false; stick.style.transform='translate(0px,0px)'; keys.up=false; keys.down=false; });
