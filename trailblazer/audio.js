// simple beep generator for feedback
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq, duration=0.08, vol=0.12){ try{ const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type='sine'; o.frequency.value = freq; g.gain.value = vol; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration); o.stop(audioCtx.currentTime + duration); }catch(e){}
}
// background music (light loop)
let bgOsc=null; function startMusic(){ if(bgOsc) return; bgOsc = audioCtx.createOscillator(); const g = audioCtx.createGain(); bgOsc.type='sine'; bgOsc.frequency.value=110; g.gain.value=0.02; bgOsc.connect(g); g.connect(audioCtx.destination); bgOsc.start(); }
function stopMusic(){ if(bgOsc){ bgOsc.stop(); bgOsc=null; }}
