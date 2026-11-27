// app.js
(function(){
  let currentView = 'home';
  function daysSinceFirstUse(){
    const st = Store.get();
    if(!st.firstUseDate) return 0;
    return Math.floor((Date.now()-new Date(st.firstUseDate).getTime())/86400000);
  }
  function isHealthUnlocked(){
    const st = Store.get();
    const gratCount = (st.gratitude||[]).length;
    const sessCount = (st.sessions||[]).length;
    return gratCount>=3 && sessCount>=3 && !!st.user.healthGoal;
  }
  window.isHealthUnlocked = isHealthUnlocked;
  function isUnlocked(feature){
    const st = Store.get();
    if(!st.onboarded) return false;
    const sessions = (st.sessions||[]).length;
    const days = daysSinceFirstUse();
    if(feature==='mindset') return true; // Mindset is primary (Großpunkt 2 first)
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
    // (mindset now always unlocked - Großpunkt 2 is primary)
    document.querySelectorAll('.nav-btn').forEach(b=> {
      b.classList.toggle('active', b.dataset.view===view);
      b.disabled = locked;
      b.style.opacity = locked ? '0.35' : '1';
      b.style.pointerEvents = locked ? 'none' : 'auto';
      b.style.filter = locked ? 'grayscale(1)' : 'none';
      b.title = '';
    });
    const healthBtn = document.getElementById('healthNavBtn');
    if(healthBtn){ healthBtn.style.display = (!locked && isHealthUnlocked()) ? '' : 'none'; }
    document.querySelectorAll('.dropdown-item[data-view]').forEach(b=> {
      b.classList.toggle('active', b.dataset.view===view);
    });
    if(locked && view!=='onboarding'){ view='onboarding'; currentView=view; }
    if(!locked && view==='health' && !isHealthUnlocked()){ view='home'; currentView=view; toast('💚 Gesundheit wird nach 3 Dankbarkeiten, 3 Sessions und einem Gesundheitsziel freigeschaltet.'); }
    const fn = window.Views[view];
    if(fn){ try { fn(); } catch(e){ console.error(e); const m=document.getElementById('main'); if(m) m.innerHTML = '<div class="card"><h2>⚠️ Fehler</h2><p class="muted">'+String(e.message||e)+'</p><button class="btn primary" onclick="location.reload()">Neu laden</button></div>'; } }
    // (focus timer cleanup handled in views.js)
  }
  window.App = { navigate };

  function updateTopbar(){
    document.getElementById('streakNum').textContent = Store.get().streak.current;
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
    // dropdown menu
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('dropdownMenu');
    if(toggle && menu){
      toggle.addEventListener('click', (e)=>{ e.stopPropagation(); menu.style.display = menu.style.display==='none'?'block':'none'; });
      document.addEventListener('click', ()=>{ menu.style.display='none'; });
      menu.querySelectorAll('.dropdown-item').forEach(b=>{
        b.addEventListener('click', (e)=>{
          e.stopPropagation();
          const v = b.dataset.view;
          if(v){ AudioFX.click(); navigate(v); }
          else if(b.id==='ddLang'){ const cur=Store.get('lang'); Store.set('lang', cur==='de'?'en':'de'); applyI18n(); navigate(currentView); updateTopbar(); }
          else if(b.id==='ddTheme'){ const cur=Store.get('theme'); const next=cur==='dark'?'light':'dark'; Store.set('theme', next); document.documentElement.setAttribute('data-theme', next); }
          menu.style.display='none';
        });
      });
    }
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
