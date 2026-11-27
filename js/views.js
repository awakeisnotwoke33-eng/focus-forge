// views.js
(function(){
  const main = () => document.getElementById('main');
  const esc = (s) => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function html(s){ main().innerHTML = s; applyI18n(); }

  // ---------- Onboarding ----------
  function onboarding(){
    const st = Store.get();
    const emojis = ['🦊','🐯','🦉','🐬','🐙','🦄','🐝','🐼','🦁','🐸'];
    html(`
      <section class="view onboarding">
        <div class="card hero-card">
          <h1 data-i18n="onboard.title">Willkommen bei FocusForge</h1>
          <p class="muted" data-i18n="onboard.sub">Besiege Prokrastination – bewusst und unterbewusst. Lass uns in 60 Sekunden starten.</p>
          <p class="muted small" style="margin-top:8px">🔒 Deine Daten bleiben in deinem Browser. Kein Account nötig.</p>
          <div class="field">
            <label data-i18n="onboard.name">Wie heißt du?</label>
            <input id="obName" type="text" value="${esc(st.user.name)}" placeholder="Name" />
          </div>
          <div class="field">
            <label data-i18n="onboard.emoji">Wähle deinen Avatar</label>
            <div class="emoji-grid" id="obEmojis">
              ${emojis.map(e=>`<button class="emoji-btn ${st.user.emoji===e?'selected':''}" data-emoji="${e}">${e}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>⏰ Tägliche Erinnerung (optional)</label>
            <input id="obCueTime" type="time" value="${esc(st.user.cueTime||'')}" />
            <p class="muted small">Um diese Zeit erinnert dich die App (Browser-Benachrichtigung).</p>
          </div>
          <p class="muted small">Profil, Ziele und WhatsApp-Opt-in kannst du später in den Einstellungen ergänzen.</p>
          <button id="obFinish" class="btn primary big" data-i18n="onboard.finish">Los geht’s</button>
          <button id="obSkip" class="btn ghost small" style="margin-top:8px">Überspringen</button>
        </div>
      </section>
    `);
    document.querySelectorAll('#obEmojis .emoji-btn').forEach(b=>{
      b.onclick=()=>{ document.querySelectorAll('#obEmojis .emoji-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); Store.update(s=>{s.user.emoji=b.dataset.emoji;}); };
    });
    document.querySelectorAll('.profile-btn').forEach(b=>{
      b.onclick=()=>{ document.querySelectorAll('.profile-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); Store.update(s=>{s.user.profile=b.dataset.profile;}); };
    });
    document.getElementById('obFinish').onclick=()=>{
      const name = document.getElementById('obName').value.trim();
      const cueTime = document.getElementById('obCueTime').value.trim();
      Store.update(s=>{ s.user.name=name; s.user.cueTime=cueTime; s.onboarded=true; if(cueTime) s.settings.reminderTime=cueTime; if(!s.firstUseDate) s.firstUseDate=new Date().toISOString(); });
      if(cueTime) requestNotifPermission();
      AudioFX.success();
      Confetti.burst();
      toast(t('msg.saved'));
      App.navigate('home');
    };
    document.getElementById('obSkip')?.addEventListener('click', ()=>{
      Store.update(s=>{ s.onboarded=true; if(!s.firstUseDate) s.firstUseDate=new Date().toISOString(); });
      App.navigate('home');
    });
  }

  // ---------- Home ----------
  function greeting(){
    const h = new Date().getHours();
    if(h<5) return t('home.greeting.night');
    if(h<12) return t('home.greeting.morning');
    if(h<18) return t('home.greeting.afternoon');
    if(h<22) return t('home.greeting.evening');
    return t('home.greeting.night');
  }
  function todayKey(){ const d=new Date(); return d.toISOString().slice(0,10); }
  function home(){
    const st = Store.get();
    const openTasks = st.tasks.filter(t=>!t.done);
    // pick one thing: highest priority open, else first
    let one = null;
    if(openTasks.length){
      const prioRank = {high:0,med:1,low:2};
      one = [...openTasks].sort((a,b)=> (prioRank[a.priority]??1)-(prioRank[b.priority]??1) || (a.createdAt-b.createdAt))[0];
    }
    const todaySessions = st.sessions.filter(s=> s.startedAt && s.startedAt.slice(0,10)===todayKey());
    const todayMin = todaySessions.reduce((a,s)=>a+(s.duration||0),0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay());
    const weekWins = st.wins.filter(w=> new Date(w.date) >= weekStart).length;
    const profile = st.user.profile;
    const recommended = window.METHODS.filter(m=>m.bestFor.includes(profile)).slice(0,3);
    html(`
      <section class="view home">
        <div class="hero">
          <h1>${greeting()}${st.user.name? ', '+esc(st.user.name):''} ${esc(st.user.emoji)}</h1>
          <p class="muted">${esc(t('home.subtitle'))}</p>
        </div>

        <div class="card one-thing">
          <div class="one-thing-label" data-i18n="home.oneThing">Dein nächster Schritt</div>
          ${one ? `
            <div class="one-thing-title">${esc(one.title)}</div>
            ${one.nextAction?`<div class="one-thing-next">→ ${esc(one.nextAction)}</div>`:''}
            <div class="one-thing-actions">
              <button class="btn primary" id="homeStart5" data-i18n="home.oneThing.cta">Jetzt 5 Min. starten</button>
              <button class="btn ghost" id="homeStartFocus">🎯 Fokus-Session</button>
              <button class="btn ghost" id="homeMarkDone">✅ ${t('tasks.done')}</button>
            </div>
          ` : `
            <div class="muted" data-i18n="home.oneThing.empty">Noch keine Aufgabe. Leg los – füge eine hinzu.</div>
            <button class="btn primary" id="homeAddTask">+ ${t('tasks.add')}</button>
          `}
        </div>

        ${st.sessions.length>=1 ? `
        <div class="card identity-card">
          <div class="identity-emoji">${esc(st.user.emoji||'🦊')}</div>
          <div>
            <div class="identity-title">Du bist jemand, der anfängt.</div>
            <div class="muted small">${st.sessions.length} Sessions · ${st.streak.current} Tage Streak · ${st.tasks.filter(t=>t.done).length} Aufgaben erledigt</div>
          </div>
        </div>` : ''}
        ${(() => {
          const today = todayKey();
          const todaySessions = st.sessions.filter(s=> s.startedAt && s.startedAt.slice(0,10)===today);
          const cueTime = st.user.cueTime || st.settings.reminderTime;
          if(cueTime && todaySessions.length===0){
            return `<div class="card cue-card">
              <strong>⏰ Zeit für deine tägliche Session</strong>
              <p class="muted small">Du hast heute noch nicht fokussiert. Ein winziger Schritt zählt.</p>
              <button class="btn primary small" id="cueStartBtn">Jetzt 5 Min.</button>
            </div>`;
          }
          if(st.streak.current===0 && st.sessions.length>0){
            return `<div class="card cue-card">
              <strong>💙 Gestern verpasst – heute zählt doppelt</strong>
              <p class="muted small">Kein Problem. Selbstmitgefühl > Schuld. Ein winziger Schritt reicht.</p>
            </div>`;
          }
          return '';
        })()}
        ${(() => {
          const last = st.lastExportDate;
          const daysSinceExport = last ? Math.floor((Date.now()-new Date(last).getTime())/86400000) : 999;
          if(st.sessions.length>=5 && daysSinceExport>=7){
            return `<div class="card cue-card"><strong>💾 Backup empfohlen</strong><p class="muted small">Du hast ${st.sessions.length} Sessions. Exportiere deine Daten, um sie nicht zu verlieren.</p><button class="btn ghost small" onclick="App.navigate('insights')">Exportieren</button></div>`;
          }
          return '';
        })()}
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-val" id="streakVal">${st.streak.current}</div><div class="stat-label" data-i18n="home.streak">Streak</div></div>
          <div class="stat-card"><div class="stat-val">${todayMin}</div><div class="stat-label" data-i18n="home.focusTime">Fokuszeit heute</div></div>
          <div class="stat-card"><div class="stat-val">${weekWins}</div><div class="stat-label" data-i18n="home.wins">Wins diese Woche</div></div>
          <div class="stat-card"><div class="stat-val">${openTasks.length}</div><div class="stat-label">Offene Aufgaben</div></div>
        </div>

        <div class="card mood-card">
          <div class="row">
            <div>
              <div class="label" data-i18n="home.mood">Stimmung</div>
              <div class="emoji-scale" id="moodScale">
                ${['😫','😕','😐','🙂','😄'].map((e,i)=>`<button class="scale-btn" data-mood="${i+1}">${e}</button>`).join('')}
              </div>
            </div>
            <div>
              <div class="label" data-i18n="home.energy">Energie</div>
              <div class="emoji-scale" id="energyScale">
                ${['🪫','🔋','⚡','🔥','🚀'].map((e,i)=>`<button class="scale-btn" data-energy="${i+1}">${e}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 data-i18n="home.quick">Schnellstart</h3>
          <div class="quick-grid">
            ${recommended.map(m=>`
              <button class="quick-btn" data-method="${m.id}">
                <span class="quick-icon">${m.icon}</span>
                <span class="quick-name">${esc(methodName(m))}</span>
                <span class="quick-dur">${m.dur} min</span>
              </button>
            `).join('')}
            <button class="quick-btn" data-method="fivemin"><span class="quick-icon">⏱️</span><span class="quick-name">${esc(methodName(window.methodById('fivemin')))}</span><span class="quick-dur">5 min</span></button>
          </div>
        </div>

        <div class="card quote-card">
          <blockquote id="dailyQuote"></blockquote>
        </div>
        <div class="card challenge-card">
          <h3>🎯 ${t('home.quick')} – Tages-Challenge</h3>
          <p id="dailyChallenge" class="muted"></p>
          <button class="btn primary small" id="challengeBtn">Annehmen</button>
        </div>

        <div class="card honest-card">
          <div class="label" data-i18n="home.honest">Ehrlich: Heute prokrastiniert?</div>
          <div class="row">
            <button class="btn ghost" id="honestYes" data-i18n="home.honest.yes">Ja, leider</button>
            <button class="btn ghost" id="honestNo" data-i18n="home.honest.no">Nein, ich war dran</button>
          </div>
          <div id="honestResp" class="muted small"></div>
        </div>
      </section>
    `);
    // handlers
    const startFocus = (methodId, task) => {
      Store.set('_pendingFocus', { method: methodId, taskId: task?task.id:null, duration: window.methodById(methodId).dur });
      App.navigate('focus');
    };
    document.getElementById('homeStart5')?.addEventListener('click', ()=>{ AudioFX.click(); startFocus('fivemin', one); });
    document.getElementById('homeStartFocus')?.addEventListener('click', ()=>{ AudioFX.click(); startFocus(one?'nextaction':'fivemin', one); });
    document.getElementById('homeMarkDone')?.addEventListener('click', ()=>{ if(one){ markTaskDone(one.id); } });
    document.getElementById('homeAddTask')?.addEventListener('click', ()=>{ App.navigate('tasks'); });
    document.getElementById('cueStartBtn')?.addEventListener('click', ()=>{ AudioFX.click(); Store.set('_pendingFocus', { method:'fivemin', taskId: null, duration:5 }); App.navigate('focus'); });
    // daily quote rotation
    const quotes = (Store.get('lang')==='en') ? [
      'The best time was yesterday. The second best is now.',
      'You do not have to be great to start, but you have to start to be great.',
      'Small steps every day beat big leaps once a month.',
      'Done is better than perfect.',
      'Focus on the next 5 minutes, not the whole mountain.',
      'Your future self will thank you for starting today.'
    ] : [
      'Der beste Zeitpunkt war gestern. Der zweitbeste ist jetzt.',
      'Du musst nicht großartig sein, um zu beginnen – aber beginnen, um großartig zu werden.',
      'Kleine Schritte jeden Tag schlagen große Sprünge einmal im Monat.',
      'Fertig ist besser als perfekt.',
      'Konzentriere dich auf die nächsten 5 Minuten, nicht auf den ganzen Berg.',
      'Dein zukünftiges Ich wird es dir danken, dass du heute begonnen hast.'
    ];
    const q = quotes[new Date().getDate() % quotes.length];
    const qEl = document.getElementById('dailyQuote'); if(qEl) qEl.textContent = '„'+q+'“';
    const challenges = (Store.get('lang')==='en') ? [
      'Complete one 5-minute focus session.',
      'Add one task with a tiny next step.',
      'Log one win today.',
      'Do your hardest task first (eat the frog).',
      'Park 3 distractions instead of chasing them.'
    ] : [
      'Schließe eine 5-Minuten-Fokus-Session ab.',
      'Füge eine Aufgabe mit winzigem nächsten Schritt hinzu.',
      'Logge heute einen Win.',
      'Erledige zuerst deine schwerste Aufgabe (Eat the Frog).',
      'Parke 3 Ablenkungen statt ihnen nachzujagen.'
    ];
    const ch = challenges[new Date().getDate() % challenges.length];
    const chEl = document.getElementById('dailyChallenge'); if(chEl) chEl.textContent = ch;
    document.getElementById('challengeBtn')?.addEventListener('click', ()=>{ Store.update(s=>{ s.wins.push({id:Date.now(), text:'Challenge: '+ch, date:new Date().toISOString()}); }); AudioFX.success(); Confetti.burst(); toast('🎯'); });
    document.querySelectorAll('.quick-btn').forEach(b=> b.addEventListener('click', ()=>{ AudioFX.click(); startFocus(b.dataset.method, one); }));
    // mood/energy (store last)
    let moodVal=null, energyVal=null;
    document.querySelectorAll('#moodScale .scale-btn').forEach(b=> b.addEventListener('click', ()=>{ document.querySelectorAll('#moodScale .scale-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); moodVal=+b.dataset.mood; Store.update(s=>{ s._lastMood=moodVal; }); toast('💙'); }));
    document.querySelectorAll('#energyScale .scale-btn').forEach(b=> b.addEventListener('click', ()=>{ document.querySelectorAll('#energyScale .scale-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); energyVal=+b.dataset.energy; Store.update(s=>{ s._lastEnergy=energyVal; }); toast('⚡'); }));
    document.getElementById('honestYes')?.addEventListener('click', ()=>{ document.getElementById('honestResp').textContent = t('home.honest.response.yes'); Store.update(s=>{ s.wins.push({id:Date.now(), text:'Ehrlich reflektiert', date:new Date().toISOString()}); }); });
    document.getElementById('honestNo')?.addEventListener('click', ()=>{ document.getElementById('honestResp').textContent = t('home.honest.response.no'); Confetti.burst(); });
  }

  function markTaskDone(id){
    Store.update(s=>{
      const tk = s.tasks.find(t=>t.id===id);
      if(tk){ tk.done=true; tk.completedAt=new Date().toISOString(); }
      s.xp += 10; recalcLevel(s);
      s.wins.push({id:Date.now(), text: (tk?tk.title:'Task')+' ✓', date:new Date().toISOString()});
    });
    AudioFX.success(); Confetti.burst();
    toast(t('msg.taskAdded')? 'Erledigt! 🎉' : 'Done!');
    home();
  }

  function recalcLevel(s){
    const newLevel = 1 + Math.floor(s.xp/100);
    if(newLevel > s.level){ s.level=newLevel; toast('Level up! '+newLevel+' 🎉'); }
    else s.level=newLevel;
  }

  // ---------- Methods ----------
  function methods(){
    const st = Store.get();
    const profile = st.user.profile;
    html(`
      <section class="view methods">
        <div class="hero">
          <h1 data-i18n="methods.title">Methoden-Bibliothek</h1>
          <p class="muted" data-i18n="methods.sub">18 wissenschaftlich fundierte Wege aus der Prokrastination. Wähle passend zu dir.</p>
        </div>
        <div class="method-grid">
          ${window.METHODS.map(m=>{
            const rec = m.bestFor.includes(profile);
            return `
            <article class="method-card ${rec?'recommended':''}" style="--accent:${m.color}">
              <div class="method-icon">${m.icon}</div>
              <h3>${esc(methodName(m))}</h3>
              <p class="muted small">${esc(methodDesc(m))}</p>
              <div class="method-meta">
                <span>⏱ ${m.dur} min</span>
                ${rec?`<span class="rec-badge">★ für dich</span>`:''}
              </div>
              <button class="btn primary small" data-method="${m.id}" data-i18n="methods.try">Jetzt ausprobieren</button>
            </article>`;
          }).join('')}
        </div>
      </section>
    `);
    document.querySelectorAll('[data-method]').forEach(b=> b.addEventListener('click', ()=>{
      AudioFX.click();
      Store.set('_pendingFocus', { method: b.dataset.method, taskId: null, duration: window.methodById(b.dataset.method).dur });
      App.navigate('focus');
    }));
  }

  // ---------- Tasks ----------
  function tasks(filter='all'){
    const st = Store.get();
    let list = st.tasks;
    if(filter==='open') list = list.filter(t=>!t.done);
    if(filter==='done') list = list.filter(t=>t.done);
    html(`
      <section class="view tasks">
        <div class="hero">
          <h1 data-i18n="tasks.title">Aufgaben</h1>
          <p class="muted" data-i18n="tasks.sub">Definiere den kleinsten nächsten Schritt. Das ist der Schlüssel.</p>
        </div>
        <div class="card add-task-card">
          <input id="taskTitle" type="text" data-i18n-placeholder="tasks.placeholder" placeholder="Was willst du erledigen?" />
          <input id="taskNext" type="text" data-i18n-placeholder="tasks.nextAction.ph" placeholder="Nächster kleinster Schritt" />
          <div class="row">
            <select id="taskPrio">
              <option value="high">${t('tasks.priority.high')}</option>
              <option value="med" selected>${t('tasks.priority.med')}</option>
              <option value="low">${t('tasks.priority.low')}</option>
            </select>
            <input id="taskTag" type="text" data-i18n-placeholder="tasks.tag" placeholder="Tag" style="max-width:140px" />
            <button id="addTaskBtn" class="btn primary">${t('common.add')}</button>
          </div>
        </div>
        <div class="filter-row">
          ${['all','open','done'].map(f=>`<button class="filter-btn ${filter===f?'active':''}" data-filter="${f}" data-i18n="tasks.filter.${f}">${f}</button>`).join('')}
        </div>
        <div class="task-list">
          ${list.length===0 ? `<div class="empty muted" data-i18n="tasks.empty">Noch keine Aufgaben.</div>` : list.map(tk=>`
            <div class="task-item ${tk.done?'done':''}">
              <button class="check-btn" data-toggle="${tk.id}">${tk.done?'✅':'⬜'}</button>
              <div class="task-body">
                <div class="task-title">${esc(tk.title)}</div>
                ${tk.nextAction?`<div class="task-next">→ ${esc(tk.nextAction)}</div>`:''}
                <div class="task-meta">
                  <span class="prio prio-${tk.priority}">${t('tasks.priority.'+tk.priority)}</span>
                  ${tk.tag?`<span class="tag">${esc(tk.tag)}</span>`:''}
                  ${tk.breakdown && tk.breakdown.length?`<span class="badge">${tk.breakdown.length} Teile</span>`:''}
                </div>
                ${tk.breakdown && tk.breakdown.length?`<ul class="breakdown">${tk.breakdown.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:''}
              </div>
              <div class="task-actions">
                <button class="icon-btn" data-breakdown="${tk.id}" title="Break down">🧩</button>
                <button class="icon-btn" data-delete="${tk.id}" title="Delete">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `);
    document.getElementById('addTaskBtn').onclick = ()=>{
      const title = document.getElementById('taskTitle').value.trim();
      if(!title){ toast('⚠️'); return; }
      const next = document.getElementById('taskNext').value.trim();
      const prio = document.getElementById('taskPrio').value;
      const tag = document.getElementById('taskTag').value.trim();
      Store.update(s=>{ s.tasks.unshift({id:Date.now(), title, nextAction:next, priority:prio, tag, done:false, createdAt:Date.now(), breakdown:[]}); });
      AudioFX.click();
      toast(t('msg.taskAdded'));
      tasks(filter);
    };
    document.querySelectorAll('[data-toggle]').forEach(b=> b.onclick=()=>{
      const id=+b.dataset.toggle;
      const tk = Store.get().tasks.find(t=>t.id===id);
      if(!tk) return;
      if(!tk.done){
        Store.update(s=>{ const t=s.tasks.find(x=>x.id===id); t.done=true; t.completedAt=new Date().toISOString(); s.xp+=10; recalcLevel(s); s.wins.push({id:Date.now(),text:t.title+' ✓',date:new Date().toISOString()}); });
        AudioFX.success(); Confetti.burst();
      } else {
        Store.update(s=>{ const t=s.tasks.find(x=>x.id===id); t.done=false; t.completedAt=null; });
      }
      tasks(filter);
    });
    document.querySelectorAll('[data-delete]').forEach(b=> b.onclick=()=>{
      const id=+b.dataset.delete;
      if(!confirm('Delete?')) return;
      Store.update(s=>{ s.tasks = s.tasks.filter(t=>t.id!==id); });
      toast(t('msg.deleted'));
      tasks(filter);
    });
    document.querySelectorAll('[data-breakdown]').forEach(b=> b.onclick=()=>{
      const id=+b.dataset.breakdown;
      const tk = Store.get().tasks.find(t=>t.id===id);
      const input = prompt('Teilaufgaben (kommagetrennt):', (tk.breakdown||[]).join(', '));
      if(input===null) return;
      const parts = input.split(',').map(x=>x.trim()).filter(Boolean);
      Store.update(s=>{ const t=s.tasks.find(x=>x.id===id); t.breakdown=parts; });
      toast(t('msg.saved'));
      tasks(filter);
    });
    document.querySelectorAll('.filter-btn').forEach(b=> b.onclick=()=> tasks(b.dataset.filter));
  }

  // ---------- Focus ----------
  let focusTimer = null, focusRemaining = 0, focusTotal = 0, focusRunning = false, focusMethod = null, focusTaskId = null, focusStartedAt = null, focusPausedAt=null, focusAccumulated=0;
  function focus(){
    const pending = Store.get()._pendingFocus || { method:'fivemin', taskId:null, duration:5 };
    Store.set('_pendingFocus', null);
    focusMethod = pending.method || 'fivemin';
    focusTaskId = pending.taskId || null;
    const m = window.methodById(focusMethod);
    focusTotal = (pending.duration || m.dur) * 60;
    focusRemaining = focusTotal;
    focusRunning = false; focusAccumulated = 0; focusStartedAt = null;
    const st = Store.get();
    const tasks = st.tasks.filter(t=>!t.done);
    html(`
      <section class="view focus">
        <div class="hero">
          <h1 data-i18n="focus.title">Fokus-Session</h1>
        </div>
        <div class="focus-layout">
          <div class="card focus-setup">
            <div class="field">
              <label data-i18n="focus.method">Methode</label>
              <select id="focusMethod">
                ${window.METHODS.map(m=>`<option value="${m.id}" ${m.id===focusMethod?'selected':''}>${m.icon} ${esc(methodName(m))}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label data-i18n="focus.duration">Dauer (Min)</label>
              <input id="focusDur" type="number" min="1" max="120" value="${Math.round(focusTotal/60)}" />
            </div>
            <div class="field">
              <label data-i18n="focus.task">Aufgabe (optional)</label>
              <select id="focusTask">
                <option value="">—</option>
                ${tasks.map(t=>`<option value="${t.id}" ${t.id===focusTaskId?'selected':''}>${esc(t.title)}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label data-i18n="focus.intent">Implementierungs-Intention (Wenn … dann …)</label>
              <input id="focusIntent" type="text" data-i18n-placeholder="focus.intent.ph" placeholder="Wenn ich mich an den Schreibtisch setze, dann öffne ich zuerst …" />
            </div>
            <div class="field">
              <label data-i18n="focus.mood.before">Stimmung vorher</label>
              <div class="emoji-scale" id="moodBefore">
                ${['😫','😕','😐','🙂','😄'].map((e,i)=>`<button class="scale-btn" data-val="${i+1}">${e}</button>`).join('')}
              </div>
            </div>
          </div>

          <div class="card focus-timer-card">
            <div class="companion" id="companion">${esc(Store.get().user.emoji||'🦊')}</div>
            <div class="method-banner" id="methodBanner">${window.methodById(focusMethod).icon} ${esc(methodName(window.methodById(focusMethod)))}</div>
            <div class="breathe" id="breathe">${t('focus.breathe')}</div>
            <div class="timer-ring">
              <svg viewBox="0 0 200 200" class="ring-svg">
                <circle cx="100" cy="100" r="90" class="ring-bg"/>
                <circle cx="100" cy="100" r="90" class="ring-fg" id="ringFg" stroke-dasharray="565.5" stroke-dashoffset="0"/>
              </svg>
              <div class="timer-text" id="timerText">${fmtTime(focusRemaining)}</div>
            </div>
            <div class="timer-controls">
              <button class="btn primary big" id="startBtn">${t('common.start')}</button>
              <button class="btn ghost" id="pauseBtn">${t('common.pause')}</button>
              <button class="btn ghost" id="stopBtn">${t('common.stop')}</button>
            </div>
            <div class="ambient-row">
              <label>🎵</label>
              <select id="ambientSelect">
                <option value="none">${t('ambient.none')}</option>
                <option value="rain">${t('ambient.rain')}</option>
                <option value="brown">${t('ambient.brown')}</option>
                <option value="ocean">${t('ambient.ocean')}</option>
              </select>
            </div>
          </div>

          <div class="card parking-card">
            <h3 data-i18n="focus.parking">Ablenkungs-Parkplatz</h3>
            <div class="parking-input">
              <input id="parkInput" type="text" data-i18n-placeholder="focus.parking.ph" placeholder="Gedanke notieren…" />
              <button id="parkBtn" class="btn small">Parken</button>
            </div>
            <ul id="parkList" class="park-list"></ul>
          </div>
        </div>
      </section>
    `);
    // ambient init
    document.getElementById('ambientSelect').value = Store.get().settings.ambient || 'none';
    document.getElementById('ambientSelect').onchange = (e)=>{ Store.update(s=>{s.settings.ambient=e.target.value;}); AudioFX.startAmbient(e.target.value); };
    // if ambient already set, start
    if(Store.get().settings.ambient && Store.get().settings.ambient!=='none') AudioFX.startAmbient(Store.get().settings.ambient);

    document.getElementById('focusMethod').onchange = (e)=>{
      focusMethod = e.target.value;
      const m = window.methodById(focusMethod);
      document.getElementById('focusDur').value = m.dur;
      document.getElementById('methodBanner').innerHTML = m.icon+' '+esc(methodName(m));
      focusTotal = m.dur*60; focusRemaining = focusTotal; updateTimerUI();
    };
    document.getElementById('focusDur').onchange = (e)=>{
      const v = Math.max(1, Math.min(120, +e.target.value||5));
      e.target.value = v; focusTotal = v*60; if(!focusRunning){ focusRemaining = focusTotal; updateTimerUI(); }
    };

    document.getElementById('startBtn').onclick = ()=> startFocusSession();
    document.getElementById('pauseBtn').onclick = ()=> pauseFocusSession();
    document.getElementById('stopBtn').onclick = ()=> stopFocusSession(true);

    // parking
    renderParkList();
    document.getElementById('parkBtn').onclick = ()=>{
      const v = document.getElementById('parkInput').value.trim();
      if(!v) return;
      Store.update(s=>{ s.distractions.unshift({id:Date.now(), text:v, date:new Date().toISOString()}); });
      document.getElementById('parkInput').value='';
      renderParkList();
      AudioFX.click();
    };
    updateTimerUI();
  }

  function fmtTime(sec){
    const m = Math.floor(sec/60); const s = sec%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function updateTimerUI(){
    document.getElementById('timerText').textContent = fmtTime(focusRemaining);
    const pct = focusTotal>0 ? (focusRemaining/focusTotal) : 1;
    const circ = 2*Math.PI*90;
    document.getElementById('ringFg').setAttribute('stroke-dashoffset', String(circ*(1-pct)));
  }
  function startFocusSession(){
    if(focusRunning) return;
    focusMethod = document.getElementById('focusMethod').value;
    focusTaskId = document.getElementById('focusTask').value || null;
    const dur = +document.getElementById('focusDur').value || 5;
    focusTotal = dur*60;
    if(focusRemaining<=0 || focusRemaining>focusTotal) focusRemaining = focusTotal;
    focusRunning = true;
    focusStartedAt = Date.now() - (focusTotal-focusRemaining)*1000;
    AudioFX.chime();
    document.getElementById('breathe').style.display='none';
    focusTimer = setInterval(tickFocus, 1000);
    document.getElementById('startBtn').textContent = t('common.running')||'Läuft…';
    document.getElementById('startBtn').disabled = true;
  }
  function tickFocus(){
    const elapsed = Math.floor((Date.now()-focusStartedAt)/1000);
    focusRemaining = Math.max(0, focusTotal - elapsed);
    updateTimerUI();
    if(focusRemaining<=0){ clearInterval(focusTimer); focusTimer=null; focusRunning=false; completeFocusSession(); }
  }
  function pauseFocusSession(){
    if(!focusRunning){ // resume
      if(focusRemaining<=0) return;
      focusRunning=true;
      focusStartedAt = Date.now() - (focusTotal-focusRemaining)*1000;
      focusTimer = setInterval(tickFocus,1000);
      document.getElementById('pauseBtn').textContent = t('common.pause');
      return;
    }
    clearInterval(focusTimer); focusTimer=null; focusRunning=false;
    document.getElementById('pauseBtn').textContent = t('common.resume');
  }
  function stopFocusSession(aborted){
    if(focusTimer){ clearInterval(focusTimer); focusTimer=null; }
    focusRunning=false;
    AudioFX.stopAmbient();
    // if aborted early, still maybe log? only log if completed
    if(!aborted) completeFocusSession();
    else { toast('⏹️'); App.navigate('home'); }
  }
  function completeFocusSession(){
    const durMin = Math.round((focusTotal - focusRemaining)/60) || Math.round(focusTotal/60);
    const moodAfter = null;
    Store.update(s=>{
      if(!s.firstUseDate) s.firstUseDate=new Date().toISOString();
      s.sessions.push({id:Date.now(), method:focusMethod, duration:durMin, completed:true, startedAt:new Date().toISOString(), taskId:focusTaskId, moodBefore: s._lastMood||null, moodAfter });
      s.xp += 5 + Math.floor(durMin/5); recalcLevel(s);
      if(focusTaskId){ const tk=s.tasks.find(t=>t.id==focusTaskId); if(tk){ /* not auto-done */ } }
      updateStreak(s);
    });
    checkBadges();
    AudioFX.success(); Confetti.burst();
    toast(t('focus.completed'));
    App.navigate('insights');
    setTimeout(()=> showMoodModal(), 400);
  }
  function updateStreak(s){
    const today = todayKey();
    if(s.streak.lastDate === today) return;
    // check yesterday
    const yest = new Date(); yest.setDate(yest.getDate()-1); const yKey = yest.toISOString().slice(0,10);
    if(s.streak.lastDate === yKey){ s.streak.current += 1; }
    else if(s.streak.lastDate === null){ s.streak.current = 1; }
    else {
      // missed days: allow one freeze per week
      const weekKey = getWeekKey();
      if(s.streak.freezeWeek !== weekKey){ s.streak.freezesUsed=0; s.streak.freezeWeek=weekKey; }
      if(s.streak.freezesUsed < 1){
        s.streak.freezesUsed += 1; s.streak.current += 1; // grace
      } else {
        s.streak.current = 1;
      }
    }
    s.streak.lastDate = today;
    if(s.streak.current > s.streak.longest) s.streak.longest = s.streak.current;
  }
  function getWeekKey(){ const d=new Date(); const y=d.getFullYear(); const w=Math.ceil(((d-new Date(y,0,1))/86400000 + new Date(y,0,1).getDay()+1)/7); return y+'-W'+w; }
  function renderParkList(){
    const list = document.getElementById('parkList'); if(!list) return;
    const items = Store.get().distractions.slice(0,20);
    list.innerHTML = items.map(d=>`<li>${esc(d.text)} <span class="muted small">${new Date(d.date).toLocaleTimeString()}</span></li>`).join('');
  }

  // ---------- Insights ----------
  function insights(){
    const st = Store.get();
    const totalMin = st.sessions.reduce((a,s)=>a+(s.duration||0),0);
    // habit strength: days active in last 14
    const daySet = new Set();
    const cutoff = Date.now() - 14*86400000;
    st.sessions.forEach(s=>{ if(s.startedAt && new Date(s.startedAt).getTime()>=cutoff) daySet.add(s.startedAt.slice(0,10)); });
    const habitStrength = Math.round((daySet.size/14)*100);
    const doneTasks = st.tasks.filter(t=>t.done).length;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()); weekStart.setHours(0,0,0,0);
    const weekSessions = st.sessions.filter(s=> new Date(s.startedAt) >= weekStart);
    const weekMin = weekSessions.reduce((a,s)=>a+(s.duration||0),0);
    const weekTasks = st.tasks.filter(t=>t.done && t.completedAt && new Date(t.completedAt)>=weekStart).length;
    html(`
      <section class="view insights">
        <div class="hero">
          <h1 data-i18n="insights.title">Insights</h1>
          <p class="muted" data-i18n="insights.sub">Deine Daten. Dein Fortschritt. Keine Scham, nur Klarheit.</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-val">${st.streak.current}</div><div class="stat-label" data-i18n="insights.streak">Aktueller Streak</div></div>
          <div class="stat-card"><div class="stat-val">${st.streak.longest}</div><div class="stat-label" data-i18n="insights.longest">Längster Streak</div></div>
          <div class="stat-card"><div class="stat-val">${st.sessions.length}</div><div class="stat-label" data-i18n="insights.sessions">Sessions</div></div>
          <div class="stat-card"><div class="stat-val">${totalMin}</div><div class="stat-label" data-i18n="insights.minutes">Fokusminuten</div></div>
          <div class="stat-card"><div class="stat-val">${doneTasks}</div><div class="stat-label" data-i18n="insights.tasks">Erledigte Aufgaben</div></div>
          <div class="stat-card"><div class="stat-val">${st.wins.length}</div><div class="stat-label" data-i18n="insights.wins">Wins</div></div>
          <div class="stat-card"><div class="stat-val">Lv ${st.level}</div><div class="stat-label">Level (${st.xp} XP)</div></div>
          <div class="stat-card"><div class="stat-val">${st.badges.length}</div><div class="stat-label" data-i18n="insights.badges">Abzeichen</div></div>
          <div class="stat-card"><div class="stat-val">${habitStrength}%</div><div class="stat-label">Gewohnheits-Stärke (14T)</div></div>
        </div>

        <div class="card">
          <h3 data-i18n="insights.weekly">Wochenrückblick</h3>
          <div class="weekly-grid">
            <div><strong>${weekMin}</strong> Min Fokus</div>
            <div><strong>${weekSessions.length}</strong> Sessions</div>
            <div><strong>${weekTasks}</strong> Aufgaben erledigt</div>
            <div><strong>${st.wins.filter(w=>new Date(w.date)>=weekStart).length}</strong> Wins</div>
          </div>
          <div class="muted small">Methoden diese Woche: ${[...new Set(weekSessions.map(s=>s.method))].map(id=>window.methodById(id)?.icon).join(' ')||'—'}</div>
        </div>

        <div class="card">
          <h3 data-i18n="insights.badges">Abzeichen</h3>
          <div class="badge-grid">
            ${badgeDefs().map(b=>{
              const unlocked = st.badges.includes(b.id);
              return `<div class="badge-item ${unlocked?'unlocked':'locked'}" title="${esc(t(b.key))}">
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-name">${esc(t(b.key))}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <h3>Letzte Sessions</h3>
          <ul class="session-list">
            ${st.sessions.slice(-10).reverse().map(s=>`
              <li><span>${window.methodById(s.method)?.icon||'🎯'}</span> ${esc(window.methodById(s.method)?methodName(window.methodById(s.method)):s.method)} · ${s.duration} min · ${new Date(s.startedAt).toLocaleString()}</li>
            `).join('') || '<li class="muted">Noch keine Sessions.</li>'}
          </ul>
        </div>

        <div class="card data-card">
          <button class="btn ghost" id="exportBtn" data-i18n="insights.export">Daten exportieren</button>
          <button class="btn ghost" id="importBtn" data-i18n="insights.import">Daten importieren</button>
          <button class="btn danger" id="resetBtn" data-i18n="insights.reset">Alles zurücksetzen</button>
          <textarea id="dataArea" rows="4" placeholder="JSON…"></textarea>
        </div>
      </section>
    `);
    document.getElementById('exportBtn').onclick = ()=>{
      const data = Store.export();
      document.getElementById('dataArea').value = data;
      // download
      const blob = new Blob([data], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='focusforge-backup.json'; a.click();
      URL.revokeObjectURL(url);
      Store.update(s=>{ s.lastExportDate = new Date().toISOString(); });
      toast(t('msg.exported'));
    };
    document.getElementById('importBtn').onclick = ()=>{
      const val = document.getElementById('dataArea').value.trim();
      if(!val){ toast('⚠️'); return; }
      if(Store.import(val)){ toast(t('msg.imported')); insights(); }
      else toast('❌');
    };
    document.getElementById('resetBtn').onclick = ()=>{
      if(!confirm('Wirklich alles löschen?')) return;
      Store.reset(); toast(t('msg.reset')); location.reload();
    };
  }

  function badgeDefs(){
    return [
      {id:'firstSession', icon:'🌱', key:'badge.firstSession'},
      {id:'streak3', icon:'🔥', key:'badge.streak3'},
      {id:'streak7', icon:'🔥🔥', key:'badge.streak7'},
      {id:'tenTasks', icon:'✅', key:'badge.tenTasks'},
      {id:'hundredMin', icon:'⏱️', key:'badge.hundredMin'},
      {id:'nightOwl', icon:'🦉', key:'badge.nightOwl'},
      {id:'earlyBird', icon:'🐦', key:'badge.earlyBird'},
    ];
  }
  function checkBadges(){
    const s = Store.get();
    const unlock = (id)=>{ if(!s.badges.includes(id)){ s.badges.push(id); toast('🏅 '+t('badge.'+id.replace(/([A-Z])/g,'$1').toLowerCase? 'badge.'+id : 'badge.'+id)); Confetti.burst(); } };
    // simpler mapping
    const add = (id)=>{ if(!s.badges.includes(id)){ s.badges.push(id); toast('🏅 '+t('badge.'+id)); Confetti.burst(); } };
    if(s.sessions.length>=1) add('firstSession');
    if(s.streak.current>=3) add('streak3');
    if(s.streak.current>=7) add('streak7');
    const doneTasks = s.tasks.filter(t=>t.done).length;
    if(doneTasks>=10) add('tenTasks');
    const totalMin = s.sessions.reduce((a,x)=>a+(x.duration||0),0);
    if(totalMin>=100) add('hundredMin');
    const last = s.sessions[s.sessions.length-1];
    if(last){ const h=new Date(last.startedAt).getHours(); if(h>=22||h<4) add('nightOwl'); if(h>=5&&h<8) add('earlyBird'); }
    Store.set('badges', s.badges);
  }

  // ---------- Settings ----------
  function settings(){
    const st = Store.get();
    const s = st.settings;
    html(`
      <section class="view settings">
        <div class="hero"><h1 data-i18n="settings.title">Einstellungen</h1></div>
        <div class="card">
          <div class="setting-row">
            <label data-i18n="settings.lang">Sprache</label>
            <select id="setLang">
              <option value="de" ${st.lang==='de'?'selected':''}>Deutsch</option>
              <option value="en" ${st.lang==='en'?'selected':''}>English</option>
            </select>
          </div>
          <div class="setting-row">
            <label data-i18n="settings.sound">Sound-Effekte</label>
            <input type="checkbox" id="setSound" ${s.sound?'checked':''} />
          </div>
          <div class="setting-row">
            <label data-i18n="settings.ambient">Umgebungsgeräusch</label>
            <select id="setAmbient">
              <option value="none" ${s.ambient==='none'?'selected':''}>${t('ambient.none')}</option>
              <option value="rain" ${s.ambient==='rain'?'selected':''}>${t('ambient.rain')}</option>
              <option value="brown" ${s.ambient==='brown'?'selected':''}>${t('ambient.brown')}</option>
              <option value="ocean" ${s.ambient==='ocean'?'selected':''}>${t('ambient.ocean')}</option>
            </select>
          </div>
          <div class="setting-row">
            <label data-i18n="settings.notifications">Erinnerungen</label>
            <input type="checkbox" id="setNotif" ${s.notifications?'checked':''} />
          </div>
          <div class="setting-row">
            <label data-i18n="settings.pomodoro">Pomodoro (Arbeit/Pause)</label>
            <input id="setPomoW" type="number" value="${s.pomodoroWork}" style="width:60px" /> / 
            <input id="setPomoB" type="number" value="${s.pomodoroBreak}" style="width:60px" />
          </div>
          <div class="setting-row">
            <label data-i18n="settings.reduced">Reduzierte Bewegung</label>
            <input type="checkbox" id="setReduced" ${s.reducedMotion?'checked':''} />
          </div>
          <div class="setting-row">
            <label>Theme</label>
            <select id="setTheme">
              <option value="dark" ${st.theme==='dark'?'selected':''}>Dark</option>
              <option value="light" ${st.theme==='light'?'selected':''}>Light</option>
            </select>
          </div>
          <div class="setting-row">
            <label>WhatsApp-Community Link</label>
            <input id="setWaLink" type="text" value="${esc(s.waGroupLink||'')}" placeholder="https://chat.whatsapp.com/..." style="min-width:240px" />
          </div>
          <div class="setting-row">
            <label>Tägliche Erinnerung (Uhrzeit)</label>
            <input id="setReminderTime" type="time" value="${esc(s.reminderTime||st.user.cueTime||'')}" />
          </div>
          <div class="setting-row">
            <label>Prokrastinations-Typ</label>
            <select id="setProfile">
              ${['perfectionist','overwhelmed','distracted','bored','fearful','energy'].map(p=>`<option value="${p}" ${st.user.profile===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="setting-row">
            <label>Wochenziel</label>
            <input id="setGoal" type="text" value="${esc(st.user.goal||'')}" placeholder="Was willst du diese Woche erreichen?" style="min-width:240px" />
          </div>
          <div class="setting-row">
            <label>Telefon (WhatsApp-Opt-in)</label>
            <input id="setPhone" type="tel" value="${esc(st.user.phone||'')}" placeholder="+49 ..." />
          </div>
          <div class="setting-row" style="display:flex;align-items:center;gap:8px">
            <input id="setWaOptin" type="checkbox" ${st.user.waOptin?'checked':''} style="width:auto" />
            <label for="setWaOptin" style="margin:0">WhatsApp-Community beitreten</label>
          </div>
          <button class="btn primary" id="saveSettings">${t('common.save')}</button>
        </div>
        <div class="card">
          <h3 data-i18n="settings.data">Daten</h3>
          <button class="btn ghost" onclick="App.navigate('insights')">${t('insights.export')}</button>
        </div>
      </section>
    `);
    document.getElementById('saveSettings').onclick = ()=>{
      const lang = document.getElementById('setLang').value;
      Store.set('lang', lang);
      const theme = document.getElementById('setTheme').value;
      Store.set('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      Store.update(s=>{
        s.settings.sound = document.getElementById('setSound').checked;
        s.settings.ambient = document.getElementById('setAmbient').value;
        s.settings.notifications = document.getElementById('setNotif').checked;
        s.settings.pomodoroWork = +document.getElementById('setPomoW').value||25;
        s.settings.pomodoroBreak = +document.getElementById('setPomoB').value||5;
        s.settings.reducedMotion = document.getElementById('setReduced').checked;
        s.settings.waGroupLink = document.getElementById('setWaLink').value.trim();
        s.settings.reminderTime = document.getElementById('setReminderTime').value.trim();
        s.user.profile = document.getElementById('setProfile').value;
        s.user.goal = document.getElementById('setGoal').value.trim();
        s.user.phone = document.getElementById('setPhone').value.trim();
        s.user.waOptin = document.getElementById('setWaOptin').checked;
        s.user.cueTime = s.settings.reminderTime;
      });
      if(document.getElementById('setNotif').checked) requestNotifPermission();
      applyI18n();
      toast(t('msg.saved'));
      updateTopbar();
    };
    document.getElementById('setLang').onchange = (e)=>{ Store.set('lang', e.target.value); applyI18n(); updateTopbar(); };
    document.getElementById('setTheme').onchange = (e)=>{ Store.set('theme', e.target.value); document.documentElement.setAttribute('data-theme', e.target.value); };
  }

  function requestNotifPermission(){
    if('Notification' in window && Notification.permission==='default'){
      Notification.requestPermission();
    }
  }

  // ---------- Mindset view ----------
  function mindset(){
    const st = Store.get();
    const today = todayKey();
    const todayEntry = (st.gratitude||[]).find(g=>g.date===today);
    const prompts = (st.lang==='en') ? [
      'What went well today?',
      'What are you grateful for right now?',
      'What did you learn from a recent mistake?',
      'What is one strength you used today?',
      'What would your best possible self do today?',
      'What are you looking forward to?'
    ] : [
      'Was ist heute gut gelaufen?',
      'Wofür bist du gerade dankbar?',
      'Was hast du aus einem Fehler gelernt?',
      'Welche Stärke hast du heute genutzt?',
      'Was würde dein bestmögliches Ich heute tun?',
      'Worauf freust du dich?'
    ];
    const prompt = prompts[new Date().getDate() % prompts.length];
    html(`
      <section class="view mindset">
        <div class="hero">
          <h1>🌱 Mindset & Dankbarkeit</h1>
          <p class="muted">Kleine tägliche Rituale, die den Blick verschieben – von dem, was fehlt, zu dem, was wirkt.</p>
        </div>
        <div class="card">
          <h3>Impuls des Tages</h3>
          <p class="muted" style="font-style:italic">„${esc(prompt)}"</p>
        </div>
        <div class="card">
          <h3>Dankbarkeits-Journal (heute)</h3>
          ${todayEntry ? `
            <ul class="wins-list">${todayEntry.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>
            <p class="muted small">Gespeichert. Morgen ein neuer Eintrag.</p>
          ` : `
            <p class="muted small">3 Dinge, die heute gut gelaufen sind:</p>
            <input id="g1" type="text" placeholder="1." />
            <input id="g2" type="text" placeholder="2." style="margin-top:8px" />
            <input id="g3" type="text" placeholder="3." style="margin-top:8px" />
            <button class="btn primary" id="saveGratitude" style="margin-top:12px">Speichern</button>
          `}
        </div>
        <div class="card">
          <h3>Identität</h3>
          <p>Du bist jemand, der <strong>anfängt</strong> und <strong>dankbar ist</strong>. ${st.sessions.length} Sessions, ${st.wins.length} Wins.</p>
        </div>
        <div class="card">
          <h3>Letzte Einträge</h3>
          <ul class="wins-list">
            ${(st.gratitude||[]).slice(-7).reverse().map(g=>`<li><strong>${g.date}</strong>: ${g.items.join(', ')}</li>`).join('') || '<li class="muted">Noch keine Einträge.</li>'}
          </ul>
        </div>
      </section>
    `);
    document.getElementById('saveGratitude')?.addEventListener('click', ()=>{
      const items = [document.getElementById('g1').value, document.getElementById('g2').value, document.getElementById('g3').value].map(x=>x.trim()).filter(Boolean);
      if(items.length===0){ toast('⚠️'); return; }
      Store.update(s=>{
        if(!s.gratitude) s.gratitude=[];
        // replace today's entry if exists
        s.gratitude = s.gratitude.filter(g=>g.date!==today);
        s.gratitude.push({date:today, items, prompt});
        s.xp += 3; recalcLevel(s);
        s.wins.push({id:Date.now(), text:'Dankbarkeit geloggt', date:new Date().toISOString()});
      });
      AudioFX.success(); Confetti.burst();
      toast('💙 Gespeichert');
      mindset();
    });
  }

  // ---------- Mood modal ----------
  function showMoodModal(){
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>${esc(t('focus.mood.after'))}</h3>
        <div class="emoji-scale" style="justify-content:center;margin:12px 0">
          ${['😫','😕','😐','🙂','😄'].map((e,i)=>`<button class="scale-btn moodpick" data-val="${i+1}">${e}</button>`).join('')}
        </div>
        <button class="btn ghost" id="moodSkip">${t('common.skip')}</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.moodpick').forEach(b=> b.addEventListener('click', ()=>{
      const n = +b.dataset.val;
      Store.update(s=>{ const last=s.sessions[s.sessions.length-1]; if(last) last.moodAfter=n; s.xp += 2; recalcLevel(s); });
      overlay.remove();
      toast('💙');
    }));
    document.getElementById('moodSkip').addEventListener('click', ()=> overlay.remove());
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
  }

  window.showMoodModal = showMoodModal;
  // ---------- exports ----------
  window.Views = { onboarding, home, methods, tasks, focus, insights, settings, mindset };

  // helpers
  function toast(msg){
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(window._toastT); window._toastT = setTimeout(()=>el.classList.remove('show'), 2200);
  }
  window.toast = toast;
})();
