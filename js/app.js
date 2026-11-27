// app.js
(function(){
  let currentView = 'home';
  function navigate(view){
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b=> b.classList.toggle('active', b.dataset.view===view));
    const st = Store.get();
    if(!st.onboarded && view!=='onboarding'){ view='onboarding'; currentView=view; }
    const fn = window.Views[view];
    if(fn) fn();
    // focus cleanup when leaving
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
