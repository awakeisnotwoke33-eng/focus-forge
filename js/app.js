// app.js
(function(){
  let currentView = 'home';
  function daysSinceFirstUse(){
    const st = Store.get();
    if(!st.firstUseDate) return 0;
    return Math.floor((Date.now()-new Date(st.firstUseDate).getTime())/86400000);
  }
  function isUnlocked(feature){
    const st = Store.get();
    if(!st.onboarded) return false;
    const sessions = (st.sessions||[]).length;
    const days = daysSinceFirstUse();
    if(feature==='mindset') return sessions>=3 || days>=3;
    if(feature==='insights_advanced') return days>=7;
    if(feature==='community') return days>=14;
    return true;
  }
  window.isUnlocked = isUnlocked;
  function navigate(view){
    currentView = view;
    const st = Store.get();
    const locked = !st.onboarded;
    // feature-level lock
    const featureLocked = !locked && (view==='mindset' && !isUnlocked('mindset'));
    document.querySelectorAll('.nav-btn').forEach(b=> {
      b.classList.toggle('active', b.dataset.view===view);
      const btnLocked = locked || (b.dataset.view==='mindset' && !isUnlocked('mindset'));
      b.disabled = btnLocked;
      b.style.opacity = btnLocked ? '0.35' : '1';
      b.style.pointerEvents = btnLocked ? 'none' : 'auto';
      b.style.filter = btnLocked ? 'grayscale(1)' : 'none';
      // show lock hint
      if(b.dataset.view==='mindset' && !isUnlocked('mindset') && !locked){
        b.title = 'Freischaltung nach 3 Sessions oder 3 Tagen';
      } else { b.title=''; }
    });
    if(locked && view!=='onboarding'){ view='onboarding'; currentView=view; }
    if(featureLocked){ view='home'; currentView=view; toast('🌱 Mindset wird nach 3 Sessions oder 3 Tagen freigeschaltet.'); }
    const fn = window.Views[view];
    if(fn){ try { fn(); } catch(e){ console.error(e); const m=document.getElementById('main'); if(m) m.innerHTML = '<div class="card"><h2>⚠️ Fehler</h2><p class="muted">'+String(e.message||e)+'</p><button class="btn primary" onclick="location.reload()">Neu laden</button></div>'; } }
    if(view!=='focus' && window._focusTimer){ clearInterval(window._focusTimer); window._focusTimer=null; }
  }
  window.App = { navigate };

  function updateTopbar(){
    document.getElementById('streakNum').textContent = Store.get().streak.current;
    document.getElementById('langToggle').onclick = ()=>{
      const cur = Store.get('lang'); const next = cur==='de'?'en':'de';
      Store.set('lang', next); applyI18n(); navigate(currentView); updateTopbar();
    };
    // theme
    document.documentElement.setAttribute('data-theme', Store.get('theme')||'dark');
  }

  function init(){
    // apply stored theme/lang
    document.documentElement.setAttribute('data-theme', Store.get('theme')||'dark');
    document.documentElement.lang = Store.get('lang')||'de';
    applyI18n();
    updateTopbar();
    // nav
    document.querySelectorAll('.nav-btn').forEach(b=> b.addEventListener('click', ()=>{ AudioFX.click(); navigate(b.dataset.view); }));
    // service worker
    if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
    // ambient restore
    const amb = Store.get().settings.ambient;
    if(amb && amb!=='none') AudioFX.startAmbient(amb);
    // daily cue reminder check (every minute)
    setInterval(()=>{
      const s = Store.get();
      const t = s.settings.reminderTime || s.user.cueTime;
      if(!t || !s.settings.notifications) return;
      if(!('Notification' in window) || Notification.permission!=='granted') return;
      const now = new Date();
      const [hh,mm] = t.split(':').map(Number);
      if(now.getHours()===hh && now.getMinutes()===mm){
        const today = now.toISOString().slice(0,10);
        const todaySessions = (s.sessions||[]).filter(x=>x.startedAt && x.startedAt.slice(0,10)===today);
        if(todaySessions.length===0){
          new Notification('FocusForge', { body: 'Zeit für deine tägliche Session ⚡', icon: '' });
        }
      }
    }, 60000);
    // cookie consent banner
    const consent = localStorage.getItem('ff_cookie_consent');
    const banner = document.getElementById('cookieBanner');
    if(!consent && banner){ banner.style.display='flex'; }
    document.getElementById('cookieAccept')?.addEventListener('click', ()=>{ localStorage.setItem('ff_cookie_consent','accepted'); banner.style.display='none'; toast('✅'); });
    document.getElementById('cookieDecline')?.addEventListener('click', ()=>{ localStorage.setItem('ff_cookie_consent','declined'); banner.style.display='none'; toast('Hinweis: Daten werden nicht gespeichert.'); });
    // initial
    const st = Store.get();
    navigate(st.onboarded ? 'home' : 'onboarding');
    // daily reminder check
    if(st.settings.notifications) scheduleReminder();
  }
  function scheduleReminder(){
    // simple: notify after 2 hours of inactivity? skip complex; just set interval
    setInterval(()=>{
      if(document.visibilityState==='hidden' && 'Notification' in window && Notification.permission==='granted'){
        new Notification('FocusForge', { body: 'Zeit für eine 5-Minuten-Session? ⚡', icon: '' });
      }
    }, 1000*60*60*2);
  }

  window.addEventListener('DOMContentLoaded', init);
  // expose focus timer global for cleanup
  window._focusTimer = null;
})();
