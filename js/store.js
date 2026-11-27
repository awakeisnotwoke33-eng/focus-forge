// store.js - localStorage state management
(function(){
  const KEY = 'focusforge_state_v1';
  const defaultState = {
    lang: 'de', theme: 'dark', onboarded: false,
    firstUseDate: null,
    lastExportDate: null,
    user: { name: '', emoji: '🦊', profile: 'overwhelmed', goal: '', phone: '', cueTime: '', waOptin: false },
    tasks: [], sessions: [], wins: [], distractions: [], gratitude: [], journal: [],
    streak: { current: 0, longest: 0, lastDate: null, freezesUsed: 0, freezeWeek: null },
    xp: 0, level: 1, badges: [],
    settings: { sound: true, ambient: 'none', notifications: false, pomodoroWork: 25, pomodoroBreak: 5, reducedMotion: false, waGroupLink: '', reminderTime: '' }
  };
  let state = null;
  function load(){ try { const raw = localStorage.getItem(KEY); state = raw ? Object.assign({}, defaultState, JSON.parse(raw)) : Object.assign({}, defaultState); } catch(e){ state = Object.assign({}, defaultState); } if(!state.streak) state.streak={current:0,longest:0,lastDate:null,freezesUsed:0,freezeWeek:null}; return state; }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){ console.warn('save fail', e); } }
  window.Store = {
    init(){ load(); },
    get(k){ if(state===null) load(); if(k===undefined) return state; return state[k]; },
    set(k,v){ if(state===null) load(); state[k]=v; save(); return state[k]; },
    update(fn){ if(state===null) load(); fn(state); save(); return state; },
    reset(){ state = Object.assign({}, defaultState); save(); return state; },
    export(){ return JSON.stringify(state, null, 2); },
    import(json){ try { const o = JSON.parse(json); if(typeof o!=='object' || o===null) return false; const safe = Object.assign({}, defaultState, o); if(!Array.isArray(safe.tasks)) safe.tasks=[]; if(!Array.isArray(safe.sessions)) safe.sessions=[]; if(!Array.isArray(safe.wins)) safe.wins=[]; if(!Array.isArray(safe.distractions)) safe.distractions=[]; if(!Array.isArray(safe.gratitude)) safe.gratitude=[]; if(!Array.isArray(safe.badges)) safe.badges=[]; state = safe; save(); return true; } catch(e){ return false; } }
  };
  window.Store.init();
})();
