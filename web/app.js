const $ = id => document.getElementById(id);
const types = ['DSA','Backend','Projects','Interview'];
const key = 'prep-desk-v1';
const uid = () => crypto.randomUUID();
const state = workspaceRead(key) || {stack:'', goal:5, logs:[], queue:[]};
const save = () => workspaceWrite(key,state);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const shift = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const fmt = (d,opts) => d.toLocaleDateString('en-IN',opts);
const btn = (label,act,id='',style='plain') => '<button class="'+style+'" data-act="'+act+'" data-id="'+esc(id)+'">'+label+'</button>';
const card = (title,body) => '<section class="card"><h2>'+title+'</h2>'+body+'</section>';
let period='today', duration=10, remaining=600, deadline=0, focus=null, submitForm;
function taskRows(items, full=false) {
 return items.map((t,i)=>'<div class="row">'+btn('✓','done',t.id)+'<div class="grow"><b>'+esc(t.title)+'</b><small>'+esc(t.type+' · '+t.topic+' · '+t.minutes+' min')+'</small></div>'+btn('Focus','focus',t.id)+(full?btn('Edit','editTask',t.id)+(i>0?btn('↑','up',t.id):'')+btn('Remove','removeTask',t.id):'')+'</div>').join('') || '<p>Your queue is clear.</p>';
}
function logRows(items,full=false) {
 return [...items].sort((a,b)=>b.date.localeCompare(a.date)).map(t=>'<div class="row"><div class="grow"><b>'+esc(t.title)+'</b><small>'+esc([t.type,t.topic,t.date,t.minutes?t.minutes+' min':''].filter(Boolean).join(' · '))+'</small>'+(t.notes?'<p>'+esc(t.notes)+'</p>':'')+'</div>'+(full?btn('Edit','editLog',t.id)+btn('Remove','removeLog',t.id):'')+'</div>').join('') || '<p>No activity logged for this period.</p>';
}
function render() {
 updateShell();
 const now=new Date(), today=dateKey(now), monday=shift(now,-((now.getDay()+6)%7));
 if (renderExtras()) return;
 const page=['queue','activity','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'dashboard';
 $('date').textContent=fmt(now,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const head=(title,sub,extra='')=>'<div class="heading"><div><h1>'+title+'</h1>'+(sub?'<p>'+sub+'</p>':'')+'</div>'+extra+'</div>';
 if(page==='queue') { $('view').innerHTML=head('Next tasks','Put the next small action at the top.',btn('＋ Add task','addTask','',''))+card('Queue',taskRows(state.queue,true));return; }
 if(page==='activity') { $('view').innerHTML=head('Activity log','Review and edit your completed work.')+card('All activity',logRows(state.logs,true));return; }
 if(page==='settings') { $('view').innerHTML=head('Settings','Update your active stack and weekly goal.')+card('Preparation goals','<label>Active backend stack (optional)<input id="stack" maxlength="100" value="'+esc(state.stack)+'"></label><label>Weekly active-day goal<input id="goal" type="number" min="1" max="7" value="'+esc(state.goal)+'"></label>'+btn('Save settings','settings','','')+' <span role="status" id="notice"></span>')+card('Appearance','<label>Theme<select id="themePreference"><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select></label>');applyTheme();return; }
 const week=state.logs.filter(l=>l.date>=dateKey(monday)&&l.date<=today);
 const shown=period==='today'?week.filter(l=>l.date===today):week;
 const days=new Set(state.logs.map(l=>l.date));
 let streak=0;
 for(let d=days.has(today)?now:shift(now,-1);days.has(dateKey(d));d=shift(d,-1)) streak++;
 const active=new Set(week.map(l=>l.date)).size;
 const next=state.queue[0];
 const stats=['DSA solved','Backend sessions','Milestones','Interview tasks','Day streak'].map((label,i)=>'<div class="stat"><b>'+(i===4?streak:shown.filter(l=>l.type===types[i]).length)+'</b><small>'+label+'</small></div>').join('');
 const topics=new Map();
 shown.forEach(l=>{const k=l.type+' · '+l.topic;topics.set(k,(topics.get(k)||0)+1)});
 const breakdown=[...topics].sort((a,b)=>b[1]-a[1]).map(([k,n])=>'<div class="barhead"><small>'+esc(k)+'</small><b>'+n+'</b></div><div class="progress"><i style="width:'+100*n/shown.length+'%"></i></div>').join('');
 const calendar=Array.from({length:7},(_,i)=>{const d=shift(monday,i);return '<div class="day '+(days.has(dateKey(d))?'on':'')+'"><small>'+fmt(d,{weekday:'short'})+'</small><b>'+d.getDate()+'</b></div>'}).join('');
 const periodControl='<div class="seg" aria-label="Activity period">'+btn('Today','period','today',period==='today'?'active':'')+btn('This week','period','week',period==='week'?'active':'')+'</div>';
 const nextTask=next?'<h2>'+esc(next.title)+'</h2><p>'+esc(next.type+' · '+next.topic+' · '+next.minutes+' min')+'</p>'+btn('Start focus →','focus',next.id,''):
  '<h2>Your queue is clear</h2>'+btn('Add task','addTask','','');
 const timer='<section class="dashboard-section timer"><h2>Focus timer</h2><p id="focusLabel">'+esc(focus?.title||'Choose a duration')+'</p><div class="clock" id="clock"></div>'+
  '<div class="seg">'+[5,10,14].map(n=>btn(n+' min','duration',n,duration===n?'active':'')).join('')+'</div><div class="actions">'+
  btn(deadline?'Pause':remaining<duration*60&&remaining>0?'Resume':'Start','timer','','')+btn('Reset','reset')+btn('Log session','timerLog')+'</div></section>';
 const consistency='<div class="week">'+calendar+'</div><div class="barhead"><small>'+active+' / '+esc(state.goal)+' active days</small><small>'+week.reduce((n,l)=>n+l.minutes,0)+' min logged</small></div><div class="progress"><i style="width:'+Math.min(100,100*active/state.goal)+'%"></i></div>';
 $('view').innerHTML=head('Dashboard',state.stack?'Backend stack <span class="stack-name">'+esc(state.stack)+'</span>':'',periodControl)+
  '<div class="stats dashboard-stats">'+stats+'</div>'+
  '<div class="dashboard-columns"><div><section class="dashboard-section next-up"><p class="section-label">Up next</p>'+nextTask+'</section>'+
  '<section class="dashboard-section"><div class="barhead"><h2>Task queue</h2><a class="text-link" href="#queue">View all →</a></div>'+(next&&state.queue.length===1?'<p>No further tasks queued.</p>':taskRows(state.queue.slice(1,4)))+'</section>'+
  '<section class="dashboard-section"><h2>'+(period==='today'?'Today’s activity':'This week’s activity')+'</h2>'+logRows(shown)+'</section></div>'+
  '<div>'+timer+'<section class="dashboard-section"><h2>Weekly consistency</h2>'+consistency+'</section>'+
  '<section class="dashboard-section"><h2>Topic breakdown</h2>'+(breakdown||'<p>Log activity to see your topic totals.</p>')+'</section></div></div>';
 tick();
}
function resetFocus(){
 remaining=duration*60;deadline=0;focus=null;
}
function tick(){
 if(deadline){
  remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
  if(!remaining){deadline=0;render();return;}
 }
 if($('clock')) $('clock').textContent=[Math.floor(remaining/60),remaining%60].map(n=>String(n).padStart(2,'0')).join(':');
}
function openEditor(mode,item={},taskToComplete=null,onSave=null){
 $('fields').oninput=null;
 const task=mode==='task';
 const editing=Boolean(item.id);
 $('formTitle').textContent=task?(editing?'Edit task':'Add next task'):(editing?'Edit activity':'Log activity');
 $('fields').innerHTML='<label>Area<select name="type">'+types.map(t=>'<option '+(t===item.type?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
 '<label>Topic or project<input name="topic" required maxlength="80" placeholder="Graphs, Express, AlgoVision, DBMS" value="'+esc(item.topic)+'"></label>'+
 '<label>Title<input name="title" required maxlength="140" value="'+esc(item.title)+'"></label>'+
 (task?'<label>Focus duration<select name="minutes">'+[5,10,14].map(n=>'<option '+(n===(item.minutes||10)?'selected':'')+'>'+n+'</option>').join('')+'</select></label>':
 '<label>Date<input name="date" type="date" required max="'+dateKey(new Date())+'" value="'+esc(item.date||dateKey(new Date()))+'"></label><label>Minutes spent (optional)<input name="minutes" type="number" min="0" max="1440" value="'+esc(item.minutes||'')+'"></label><label>Notes (optional)<textarea name="notes" maxlength="1000">'+esc(item.notes)+'</textarea></label>');
 submitForm=()=>{
  const entry=Object.fromEntries(new FormData($('form')));
  entry.title=entry.title.trim(); entry.topic=entry.topic.trim();
  if(!entry.title||!entry.topic){$('form').querySelector(!entry.title?'[name=title]':'[name=topic]').focus();return;}
  entry.minutes=Number(entry.minutes);
  entry.id=item.id||uid();
  const list=task?state.queue:state.logs;
  const index=list.findIndex(row=>row.id===entry.id);
  if(index<0)list.push(entry);else list[index]=entry;
  if(taskToComplete){
   state.queue=state.queue.filter(row=>row.id!==taskToComplete);
   if(focus?.id===taskToComplete)resetFocus();
  }
  onSave?.();
  save();$('dialog').close();render();
 };
 $('dialog').showModal();
}
$('form').onsubmit=e=>{e.preventDefault();submitForm()};
$('cancel').onclick=()=>$('dialog').close();
$('log').onclick=()=>openEditor('log');
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-act]');if(!b)return;
 const {act,id}=b.dataset;
 const task=state.queue.find(t=>t.id===id);
 const log=state.logs.find(t=>t.id===id);
 switch(act){
 case 'extra': return extraAction(id);
 case 'period': period=id;break;
 case 'addTask': return openEditor('task');
 case 'editTask': return openEditor('task',task);
 case 'editLog': return openEditor('log',log);
 case 'done': return openEditor('log',{type:task.type,topic:task.topic,title:task.title},id);
 case 'removeTask':
  if(confirm('Remove this task?')){
   state.queue=state.queue.filter(t=>t.id!==id);
   if(focus?.id===id)resetFocus();
  }
  break;
 case 'removeLog': if(confirm('Remove this activity?'))state.logs=state.logs.filter(t=>t.id!==id);break;
 case 'up': {const i=state.queue.indexOf(task);if(i>0)[state.queue[i-1],state.queue[i]]=[state.queue[i],state.queue[i-1]];break;}
 case 'focus': focus=task;duration=task.minutes;remaining=duration*60;deadline=Date.now()+remaining*1000;location.hash='dashboard';break;
 case 'duration': duration=Number(id);remaining=duration*60;deadline=0;break;
 case 'timer': if(deadline){tick();deadline=0;}else{if(!remaining)remaining=duration*60;deadline=Date.now()+remaining*1000;}break;
 case 'reset': resetFocus();break;
 case 'timerLog': {
  tick(); const elapsed=duration*60-remaining;
  const item=focus?{type:focus.type,topic:focus.topic,title:focus.title}:{type:'Backend'};
  return openEditor('log',{...item,minutes:Math.ceil(elapsed/60)},focus?.id,resetFocus);
 }
 case 'settings': {
  const stack=$('stack').value.trim(),goal=Number($('goal').value);
  if(!Number.isInteger(goal)||goal<1||goal>7){$('notice').textContent='Enter a goal from 1 to 7.';return;}
  state.stack=stack;state.goal=goal;$('notice').textContent=save()?(guestMode?'Saved.':'Updated. See the sync status below.'):'Changes are not synced.';return;
 }
 }
 if(['removeTask','removeLog','up'].includes(act))save();
 render();
 if(e.detail===0){
  const replacement=Array.from(document.querySelectorAll('#view [data-act]'))
   .find(button=>button.dataset.act===act&&button.dataset.id===id);
  const fallback=document.querySelector('#view h1');
  if(fallback)fallback.tabIndex=-1;
  (replacement??fallback)?.focus();
 }
});
function updateShell(){
 const page=location.hash.slice(1).split('/')[0]||'dashboard';
 document.querySelectorAll('nav a').forEach(a=>{
  const current=a.hash==='#'+page;
  a.classList.toggle('active',current);
  if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 });
 $('openMore')?.classList.toggle('active',['activity','profile','settings'].includes(page));
 const name=extras.name||'Your profile';
 $('displayName').textContent=name;
 $('initials').textContent=name.trim().split(/\s+/).slice(0,2).map(w=>Array.from(w)[0]).join('').toUpperCase();
}
let renderedDay=dateKey(new Date());
function refreshDay(){
 const now=dateKey(new Date());
 if(now!==renderedDay&&!$('dialog').open){renderedDay=now;render()}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay()});
setInterval(refreshDay,30000);
window.addEventListener('hashchange',render);
setInterval(tick,250);
applyTheme();
