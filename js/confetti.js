// confetti.js - lightweight canvas confetti
window.Confetti = (function(){
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();
  function burst(x, y, count=80){
    const reduced = window.Store.get('settings').reducedMotion;
    if(reduced) return;
    const colors = ['#5eead4','#f59e0b','#f472b6','#a78bfa','#22c55e','#38bdf8','#fbbf24'];
    for(let i=0;i<count;i++){
      particles.push({
        x: x||canvas.width/2, y: y||canvas.height/3,
        vx: (Math.random()-0.5)*8, vy: Math.random()*-9-2,
        g: 0.25+Math.random()*0.15,
        size: 4+Math.random()*6,
        rot: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.3,
        color: colors[Math.floor(Math.random()*colors.length)],
        life: 1, decay: 0.012+Math.random()*0.008,
        shape: Math.random()<0.5?'rect':'circle'
      });
    }
    if(!running) loop();
  }
  let running = false;
  function loop(){
    running = true;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles = particles.filter(p=>p.life>0);
    for(const p of particles){
      p.vy += p.g; p.x += p.vx; p.vx *= 0.99; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
      ctx.save(); ctx.globalAlpha = Math.max(0,p.life);
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if(p.shape==='rect'){ ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2); }
      else { ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    if(particles.length){ requestAnimationFrame(loop); } else { running=false; ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
  return { burst };
})();
