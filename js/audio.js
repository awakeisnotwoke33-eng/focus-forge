// audio.js - Web Audio: SFX + ambient noise generators
window.AudioFX = (function(){
  let ctx = null;
  function ensure(){ if(!ctx){ try { ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ ctx=null; } } if(ctx && ctx.state==='suspended') ctx.resume(); return ctx; }
  function tone(freq, dur, type='sine', vol=0.15, delay=0){
    const c = ensure(); if(!c) return;
    const o = c.createOscillator(); const g = c.createGain();
    o.type=type; o.frequency.value=freq;
    const t = c.currentTime + delay;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t+dur+0.05);
  }
  function click(){ if(!window.Store.get('settings').sound) return; tone(880,0.08,'square',0.08); }
  function success(){ if(!window.Store.get('settings').sound) return; tone(523,0.12,'sine',0.15); tone(659,0.12,'sine',0.15,0.12); tone(784,0.18,'sine',0.18,0.24); }
  function chime(){ if(!window.Store.get('settings').sound) return; tone(660,0.4,'sine',0.12); }
  // ambient
  let ambientNode = null, ambientGain = null;
  function stopAmbient(){ if(ambientNode){ try{ ambientNode.stop(); }catch(e){} ambientNode=null; } if(ambientGain){ ambientGain.disconnect(); ambientGain=null; } }
  function noiseBuffer(type){
    const c = ensure(); if(!c) return null;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    if(type==='brown'){
      let last=0;
      for(let i=0;i<len;i++){ const w=Math.random()*2-1; data[i]=(last+(0.02*w))/1.02; last=data[i]; data[i]*=3.5; }
    } else if(type==='rain'){
      for(let i=0;i<len;i++){ data[i]=(Math.random()*2-1)*0.4; }
      // simple lowpass later
    } else {
      for(let i=0;i<len;i++){ data[i]=Math.random()*2-1; }
    }
    return buf;
  }
  function startAmbient(kind){
    stopAmbient();
    if(kind==='none') return;
    const c = ensure(); if(!c) return;
    const buf = noiseBuffer(kind==='brown'?'brown':(kind==='rain'?'rain':'white'));
    const src = c.createBufferSource(); src.buffer=buf; src.loop=true;
    const g = c.createGain(); g.gain.value = 0.06;
    let node = src;
    if(kind==='rain' || kind==='ocean'){
      const lp = c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = kind==='ocean'?400:1200;
      node.connect(lp); lp.connect(g);
    } else if(kind==='brown'){
      const lp = c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600;
      node.connect(lp); lp.connect(g);
    } else {
      node.connect(g);
    }
    g.connect(c.destination);
    src.start();
    ambientNode=src; ambientGain=g;
  }
  return { ensure, tone, click, success, chime, startAmbient, stopAmbient };
})();
