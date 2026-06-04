const STORAGE_KEY = 'myLifeQuest.v2.productivityEngine';
const DEFAULT_DASHBOARD_ORDER = ['top3','focus','progress','projects','next','streak','points','areas'];
const DEFAULT_PAGE_ORDER = ['tasks','projects','goals','routines'];
const LABELS = {
  top3:'⭐ Today’s Top 3', focus:'⏱ Focus Time', progress:'📊 Weekly Progress', projects:'🚀 Active Projects', next:'➡️ Next Actions', streak:'🔥 Streak', points:'💎 Quest Points', areas:'🧭 Life Areas',
  tasks:'Tasks', projects:'Projects', goals:'Goals', routines:'Routines'
};
const starter = () => ({
  points: 430,
  streak: 3,
  focusMinutesToday: 0,
  compact: false,
  dashboardOrder: [...DEFAULT_DASHBOARD_ORDER],
  pageOrder: [...DEFAULT_PAGE_ORDER],
  expanded: {},
  items: [
    item('task','Plan pool house supply run','Projects',3,25,'', ['Check current materials','Price flooring','Confirm window AC sleeve']),
    item('task','Protein + lifting check-in','Health',2,15,'', ['Log protein','Pick workout','Fill water cup']),
    item('task','Create one Grace & Order post','Grace & Order',3,20,'', ['Choose hook','Draft caption','Make Canva graphic']),
    item('project','Pool House Build','Projects',3,45,'', ['Finalize layout','Buy supplies','Frame interior','Install vinyl floor']),
    item('project','Grace & Order Growth','Grace & Order',3,30,'', ['Post short video','Create Pinterest pin','Update content tracker']),
    item('goal','Body Transformation','Health',3,25,'', ['Lift 4x weekly','Hit protein target','Walk 5k steps']),
    item('routine','Evening Reset','Home',2,20,'', ['Dishes','Counters','Prep tomorrow','Laundry switch'])
  ]
});
function item(type,title,area,priority,minutes,due,subtasks){ return { id: crypto.randomUUID(), type, title, area, priority, minutes, due, done:false, created: new Date().toISOString(), subtasks: subtasks.map(text => ({id: crypto.randomUUID(), text, done:false})) }; }
let state = load();
let timer = null, remaining = 1500, currentFocusIds = [];
function load(){ try { return {...starter(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {})}; } catch { return starter(); } }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function pct(it){ if(!it.subtasks?.length) return it.done ? 100 : 0; return Math.round(it.subtasks.filter(s=>s.done).length / it.subtasks.length * 100); }
function score(it){ const dueBoost = it.due ? Math.max(0, 20 - Math.ceil((new Date(it.due)-new Date())/86400000)) : 0; return it.priority*20 + dueBoost + (it.type === 'task' ? 10 : 0) - Math.max(0, (it.minutes||15)-25)/3; }
function incomplete(){ return state.items.filter(i => !i.done && pct(i) < 100); }
function render(){ save(); document.body.classList.toggle('compact', !!state.compact); renderDashboard(); renderSettings(); renderLists(); }
function renderDashboard(){
  const el = document.getElementById('dashboard'); el.innerHTML = '';
  for(const id of state.dashboardOrder){ el.appendChild(widget(id)); }
}
function widget(id){
  const w = document.createElement('article'); w.className = 'widget' + (id === 'top3' || id === 'areas' ? ' wide' : '');
  const sorted = [...incomplete()].sort((a,b)=>score(b)-score(a));
  const completedThisWeek = state.items.filter(i=>i.done).length;
  const totalProgress = Math.round(state.items.reduce((sum,i)=>sum+pct(i),0)/Math.max(1,state.items.length));
  if(id==='top3') w.innerHTML = `<h2>${LABELS[id]}</h2>${sorted.slice(0,3).map((i,n)=>`<p><strong>${n+1}. ${i.title}</strong><br><span class="meta">${i.area} • ${i.minutes || 15} min • ${pct(i)}%</span></p>`).join('') || '<p>No open tasks. Add a quest!</p>'}`;
  if(id==='focus') w.innerHTML = `<h2>${LABELS[id]}</h2><div class="stat">${state.focusMinutesToday} min</div><p>Focus time completed today.</p>`;
  if(id==='progress') w.innerHTML = `<h2>${LABELS[id]}</h2><div class="stat">${totalProgress}%</div><div class="progress-bar"><div class="progress-fill" style="width:${totalProgress}%"></div></div><p>${completedThisWeek} completed items tracked.</p>`;
  if(id==='projects') w.innerHTML = `<h2>${LABELS[id]}</h2><div class="stat">${state.items.filter(i=>i.type==='project'&&!i.done).length}</div><p>Active projects.</p>`;
  if(id==='next') w.innerHTML = `<h2>${LABELS[id]}</h2>${sorted.slice(0,5).map(i=>`<p>${i.title}<br><span class="meta">${i.area} • priority ${i.priority}</span></p>`).join('')}`;
  if(id==='streak') w.innerHTML = `<h2>${LABELS[id]}</h2><div class="stat">${state.streak} days</div><p>Keep one small promise today.</p>`;
  if(id==='points') w.innerHTML = `<h2>${LABELS[id]}</h2><div class="stat">${state.points}</div><p>Earn points for tasks, subtasks, and focus sessions.</p>`;
  if(id==='areas') { const areas = [...new Set(state.items.map(i=>i.area))]; w.innerHTML = `<h2>${LABELS[id]}</h2>` + areas.map(a=>{ const items = state.items.filter(i=>i.area===a); const p = Math.round(items.reduce((s,i)=>s+pct(i),0)/Math.max(1,items.length)); return `<p><strong>${a}</strong> <span class="meta">${p}%</span><div class="progress-bar"><div class="progress-fill" style="width:${p}%"></div></div></p>`}).join(''); }
  return w;
}
function renderSettings(){ makeOrder('dashboardOrder', state.dashboardOrder, DEFAULT_DASHBOARD_ORDER); makeOrder('pageOrder', state.pageOrder, DEFAULT_PAGE_ORDER); }
function makeOrder(elId, arr, defaults){
  const el = document.getElementById(elId); el.innerHTML = '';
  for(const id of arr){ const row = document.createElement('div'); row.className='sort-row'; row.innerHTML = `<span>${LABELS[id]}</span><span><button data-up="${id}" data-list="${elId}">↑</button> <button data-down="${id}" data-list="${elId}">↓</button></span>`; el.appendChild(row); }
  const reset = document.createElement('button'); reset.textContent='Reset order'; reset.onclick=()=>{ state[elId]=[...defaults]; render(); }; el.appendChild(reset);
}
function renderLists(){
  const root = document.getElementById('lists'); root.innerHTML='';
  for(const type of state.pageOrder){
    const sec = document.createElement('section'); sec.className='list-page';
    sec.innerHTML = `<div class="list-header"><div><h2>${LABELS[type]}</h2><p>Drag-free custom order using arrows. Subtasks give partial credit.</p></div><div><button data-move-page-up="${type}">Page ↑</button><button data-move-page-down="${type}">Page ↓</button></div></div>`;
    const items = state.items.filter(i=>i.type === type.slice(0,-1));
    items.sort((a,b)=>score(b)-score(a)).forEach((it, idx)=> sec.appendChild(renderItem(it, idx)));
    root.appendChild(sec);
  }
}
function renderItem(it){
  const div = document.createElement('div'); div.className = `item ${state.expanded[it.id] === false ? 'collapsed':''} ${it.done?'completed':''}`;
  const p = pct(it); const subDone = it.subtasks.filter(s=>s.done).length;
  div.innerHTML = `<div class="item-head"><button data-toggle="${it.id}">${state.expanded[it.id]===false?'▶':'▼'}</button><div><div class="item-title">${it.title}</div><div class="meta"><span class="badge">${it.area}</span><span class="badge">${it.minutes || 15} min</span><span class="badge">${p}%</span>${it.due?`<span class="badge">Due ${it.due}</span>`:''}</div></div><button data-up-item="${it.id}">↑</button><button data-down-item="${it.id}">↓</button><button class="danger" data-delete="${it.id}">Delete</button></div><div class="item-body"><div class="progress-bar"><div class="progress-fill" style="width:${p}%"></div></div><p class="meta">${subDone}/${it.subtasks.length || 1} steps complete</p><div>${it.subtasks.map(s=>`<label class="subtask"><input type="checkbox" data-subtask="${it.id}:${s.id}" ${s.done?'checked':''}/> ${s.text}</label>`).join('') || '<p>No subtasks yet.</p>'}</div><label class="subtask"><input type="checkbox" data-done="${it.id}" ${it.done?'checked':''}/> Mark whole item complete</label></div>`;
  return div;
}
function chooseFocus(){
  let remainingMin = 25, picks=[];
  for(const it of [...incomplete()].sort((a,b)=>score(b)-score(a))){ if((it.minutes||15) <= remainingMin || picks.length===0){ picks.push(it); remainingMin -= Math.min(remainingMin, it.minutes||15); } if(remainingMin <= 3) break; }
  return picks;
}
function openFocus(){
  const picks = chooseFocus(); currentFocusIds = picks.map(i=>i.id); remaining = 1500;
  document.getElementById('timerDisplay').textContent='25:00';
  document.getElementById('focusSummary').textContent = picks.length ? 'Here is the best 25-minute sprint based on priority, due date, and effort.' : 'No open tasks found.';
  document.getElementById('focusPlan').innerHTML = picks.map(i=>`<p><strong>${i.title}</strong><br><span class="meta">${i.area} • ${i.minutes||15} min • ${pct(i)}% complete</span></p>`).join('');
  document.getElementById('completionCheckin').classList.add('hidden');
  document.getElementById('focusDialog').showModal();
}
function checkIn(){
  clearInterval(timer); timer=null;
  const el = document.getElementById('completionCheckin'); el.classList.remove('hidden');
  const picks = state.items.filter(i=>currentFocusIds.includes(i.id));
  el.innerHTML = `<h3>What did you complete?</h3>${picks.map(i=>`<label class="subtask"><input type="checkbox" data-focus-complete="${i.id}"/> ${i.title}</label>`).join('')}<button type="button" class="primary" id="saveFocusBtn">Save Focus Session</button>`;
}
function advice(){
  const top = chooseFocus()[0];
  const html = top ? `<p><strong>Do this next:</strong> ${top.title}</p><p>Why: it has the best mix of priority, urgency, and a realistic focus-block length.</p><p class="meta">Area: ${top.area} • ${top.minutes||15} minutes • ${pct(top)}% complete</p>` : '<p>You have no open tasks. Add one small next action.</p>';
  document.getElementById('aiAdvice').innerHTML = html; document.getElementById('aiDialog').showModal();
}
document.addEventListener('click', e=>{
  const t=e.target;
  if(t.id==='focusMeBtn') openFocus();
  if(t.id==='askAiBtn') advice();
  if(t.id==='expandAllBtn'){ state.items.forEach(i=>state.expanded[i.id]=true); render(); }
  if(t.id==='collapseAllBtn'){ state.items.forEach(i=>state.expanded[i.id]=false); render(); }
  if(t.id==='compactBtn'){ state.compact=!state.compact; render(); }
  if(t.id==='resetDemoBtn' && confirm('Reload starter data? This replaces current saved data.')){ state=starter(); render(); }
  if(t.dataset.toggle){ state.expanded[t.dataset.toggle] = state.expanded[t.dataset.toggle] === false; render(); }
  if(t.dataset.delete){ state.items = state.items.filter(i=>i.id!==t.dataset.delete); render(); }
  if(t.dataset.up || t.dataset.down){ const key=t.dataset.list; move(state[key], t.dataset.up||t.dataset.down, !!t.dataset.up); render(); }
  if(t.dataset.movePageUp || t.dataset.movePageDown){ move(state.pageOrder, t.dataset.movePageUp||t.dataset.movePageDown, !!t.dataset.movePageUp); render(); }
  if(t.dataset.upItem || t.dataset.downItem){ moveItem(t.dataset.upItem||t.dataset.downItem, !!t.dataset.upItem); render(); }
  if(t.id==='startTimerBtn'){ clearInterval(timer); timer=setInterval(()=>{ remaining--; const m=String(Math.floor(remaining/60)).padStart(2,'0'), s=String(remaining%60).padStart(2,'0'); document.getElementById('timerDisplay').textContent=`${m}:${s}`; if(remaining<=0) checkIn(); },1000); }
  if(t.id==='finishNowBtn') checkIn();
  if(t.id==='saveFocusBtn'){ document.querySelectorAll('[data-focus-complete]:checked').forEach(cb=>completeItem(cb.dataset.focusComplete)); state.focusMinutesToday += 25; state.points += 25; render(); document.getElementById('focusDialog').close(); }
  if(t.id==='exportBtn'){ const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='my-life-quest-backup.json'; a.click(); }
});
document.addEventListener('change', e=>{
  const t=e.target;
  if(t.dataset.subtask){ const [id,sid]=t.dataset.subtask.split(':'); const it=state.items.find(i=>i.id===id); const sub=it?.subtasks.find(s=>s.id===sid); if(sub){ sub.done=t.checked; if(t.checked) state.points+=3; if(pct(it)===100) it.done=true; render(); } }
  if(t.dataset.done){ const it=state.items.find(i=>i.id===t.dataset.done); if(it){ it.done=t.checked; if(t.checked){ it.subtasks.forEach(s=>s.done=true); state.points+=10; } render(); } }
  if(t.id==='importFile'){ const file=t.files[0]; if(file){ file.text().then(txt=>{ state=JSON.parse(txt); render(); }); } }
});
document.getElementById('quickAddForm').addEventListener('submit', e=>{
  e.preventDefault(); const type=itemType.value, title=itemTitle.value.trim(), area=itemArea.value, priority=+itemPriority.value, minutes=+itemMinutes.value||15, due=itemDue.value;
  const subs=itemSubtasks.value.split('\n').map(s=>s.trim()).filter(Boolean); state.items.push(item(type,title,area,priority,minutes,due,subs)); e.target.reset(); itemMinutes.value=15; render();
});
function move(arr, id, up){ const i=arr.indexOf(id); const j=up?i-1:i+1; if(i>=0&&j>=0&&j<arr.length){ [arr[i],arr[j]]=[arr[j],arr[i]]; } }
function moveItem(id, up){ const i=state.items.findIndex(x=>x.id===id); const j=up?i-1:i+1; if(i>=0&&j>=0&&j<state.items.length){ [state.items[i],state.items[j]]=[state.items[j],state.items[i]]; } }
function completeItem(id){ const it=state.items.find(i=>i.id===id); if(it){ it.done=true; it.subtasks.forEach(s=>s.done=true); state.points+=10; } }
render();
