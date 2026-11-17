const extraKey='prep-desk-college-diet-v1';
const extras=workspaceRead(extraKey)||{subjects:[],exams:[],meals:[],name:''};
const foods=[
 ['Small phulka / chapati','1 piece',80,3,16,1],
 ['Cooked rice','1 cup',170,3.5,38,0.4],
 ['Plain dal','½ cup',100,6,15,2],
 ['Dry mixed sabzi','1 cup',150,4,17,7],
 ['Poha','1 cup',270,5,44,8],
 ['Upma','1 cup',270,6,42,8.5],
 ['Idli','2 pieces',150,5,30,1],
 ['Plain dosa','1 piece',125,3,20,3.5],
 ['Sambar','1 cup',110,5,16,3],
 ['Khichdi','1 cup',200,7,35,4],
 ['Paratha','1 piece',150,4,22,5],
 ['Puri','1 piece',80,1.5,10,3.5],
 ['Paneer','100 g',265,18,3,20],
 ['Cooked chana','½ cup',135,7,22,2],
 ['Chicken curry','¾ cup',240,20,6,15],
 ['Boiled egg','1 large',78,6.3,0.6,5.3],
 ['Banana','1 medium',105,1.3,27,0.4],
 ['Milk (45 kcal per 100 ml)','100 ml',45,3.2,4.8,1.4],
 ['Dry oats','40 g scoop',152,5.3,27,2.6],
 ['Peanuts','50 g',285,13,8,25],
 ['Peanut butter','1 tsp (5 g)',30,1.2,1,2.5],
 ['Tea with milk and sugar','1 cup',70,2,10,2],
 ['Ghee or oil','1 tsp',45,0,0,5],
 ['Whey protein shake with water','1 scoop (about 30 g)',120,24,3,1.5],
 ['Plain dahi / curd','100 g',65,3.5,5,3.5],
 ['Plain chaas / buttermilk','1 glass (200 ml)',55,3,5,2.5],
 ['Rajma curry','¾ cup',175,9,25,4],
 ['Chole masala','¾ cup',205,9,29,6],
 ['Moong dal chilla','1 medium',130,7,18,4],
 ['Besan chilla','1 medium',145,6,18,5],
 ['Aloo paratha','1 medium',220,5,35,7],
 ['Soya chunks, cooked','25 g dry weight',85,13,8,0.2],
 ['Roasted chana','30 g',110,6,18,2],
 ['Sprouted moong salad','1 small bowl',95,6,15,1],
 ['Peas pulao','1 cup',230,5,40,6],
 ['Lemon rice','1 cup',235,4,39,7],
 ['Dhokla','2 pieces',125,5,18,4],
 ['Vegetable uttapam','1 medium',175,5,29,4],
 ['Coconut chutney','2 tbsp',75,1,3,7],
 ['Fish curry','¾ cup',180,17,5,10],
 ['Egg bhurji','2 eggs',210,13,4,15],
 ['Aloo gobi','½ cup',100,2,13,5],
 ['Bhindi sabzi','½ cup',90,2,8,5],
 ['Mixed vegetable sabzi','½ cup',95,3,12,4],
 ['Apple','1 medium',95,0.5,25,0.3],
 ['Papaya','1 cup diced',60,1,15,0.3],
 ['Orange / santra','1 medium',65,1,16,0.2]
];
let dietDay='',installPrompt;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;render()});
window.addEventListener('appinstalled',()=>{installPrompt=null;render()});
const saveExtras=()=>workspaceWrite(extraKey,extras);
const extraBtn=(label,action,id='',style='plain')=>btn(label,'extra',action+(id?'~'+id:''),style);
const input=(label,name,value='',attrs='required maxlength="100"')=>'<label>'+label+'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
const menu=(label,name,values,value)=>'<label>'+label+'<select name="'+name+'">'+values.map(([k,v])=>'<option value="'+esc(k)+'" '+(String(k)===String(value)?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>';
const row=(content,actions='')=>'<div class="row"><div class="grow">'+content+'</div>'+actions+'</div>';
const title=(label,description,actions='')=>'<div class="heading"><div><h1>'+label+'</h1><p>'+description+'</p></div>'+actions+'</div>';
const groups=['Breakfast','Lunch','Dinner','Snack'];
const total=(meals)=>[0,0,0,0].map((_,i)=>meals.reduce((sum,m)=>sum+m.nutrients[i]*m.quantity,0));
const amount=n=>Number(n.toFixed(1));
const macros=ns=>ns.map((n,i)=>amount(n)+[' kcal',' g protein',' g carbs',' g fat'][i]).join(' · ');
function renderExtras(){
 const [page,subjectId]=location.hash.slice(1).split('/');
 if(!['exams','diet','profile'].includes(page))return false;
 const now=new Date(), today=dateKey(now);
 $('date').textContent=fmt(now,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 if(page==='profile'){
  $('view').innerHTML=title('Profile','Manage your display name and install Prep Desk on your phone.')+
   card('Account','<p><b>'+esc(extras.name||'Your profile')+'</b></p><p>'+ (guestMode?'You are using a guest workspace.':'Your workspace uses ChatGPT sign-in.') +'</p><div class="row">'+extraBtn('Edit display name','name')+(guestMode?'<a class="button-link" href="/welcome.html">Sign-in options</a>':(canImportLocal()?extraBtn('Import browser records','import'):'')+extraBtn('Retry sync','sync')+'<a class="button-link" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out of Site</a>')+'</div>' )+
   card('Privacy and data','<p>When you sign in, Prep Desk uses your Sites account ID to keep your synced records separate. Pending edits stay in this browser until sync succeeds. Guest records stay in this browser and can be opened by anyone using the same browser profile.</p><p>On a shared browser, export any edits you need, discard local drafts, clear guest records, and sign out. Export includes workspace records and available drafts. Deleting your workspace removes synced records and this browser’s account drafts. Older drafts on other devices can still be downloaded or discarded there.</p><div class="recovery-actions">'+extraBtn('Export my data','export')+(guestMode?'':extraBtn('Delete my workspace','deleteWorkspace'))+extraBtn('Clear guest data','clearGuest')+'</div>')+
   card('Install on your phone','<p><b>Android</b> Open this Site in Chrome and tap ⋮ → Add to Home screen or Install app.</p><p><b>iPhone</b> Open this Site in Safari, tap Share → Add to Home Screen, then tap Add.</p><p>Open the installed app while online. Choose guest mode or sign in with ChatGPT. Guest records stay in local app storage. Signed-in records sync across devices.</p>'+(installPrompt?'<p>'+extraBtn('Install Prep Desk','install','','')+'</p>':''));
  return true;
 }
 if(page==='exams'){
  const subject=extras.subjects.find(s=>s.id===subjectId);
  if(subject){
   const done=subject.units.filter(u=>u.done).length;
   $('view').innerHTML='<p class="back"><a href="#exams">← All exams</a></p>'+title(esc(subject.title),'Syllabus and revision checklist',extraBtn('＋ Add syllabus item','unit',subject.id,''))+
    card('Syllabus progress','<p>'+done+' / '+subject.units.length+' completed</p><progress max="'+(subject.units.length||1)+'" value="'+done+'"></progress>'+
     (subject.units.map(u=>row('<label class="check"><input type="checkbox" data-unit="'+esc(u.id)+'" data-subject="'+esc(subject.id)+'" '+(u.done?'checked':'')+'><b>'+esc(u.title)+'</b></label>'+(u.notes?'<p>'+esc(u.notes)+'</p>':''),extraBtn('Edit','editUnit',subject.id+'/'+u.id)+extraBtn('Remove','removeUnit',subject.id+'/'+u.id))).join('')||'<p>Add your first unit, topic, or revision task.</p>'));
   return true;
  }
  $('view').innerHTML=title('Exams','Plan your college exams and track syllabus coverage.')+'<div class="grid"><section class="card"><div class="barhead"><h2>Exam timetable</h2>'+extraBtn('＋ Add exam','exam','','')+'</div>'+
   ([...extras.exams].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(x=>row('<b>'+esc(extras.subjects.find(s=>s.id===x.subject)?.title||'Subject')+'</b><small>'+esc([x.date,x.time,x.location].filter(Boolean).join(' · '))+'</small>',extraBtn('Edit','exam',x.id)+extraBtn('Remove','removeExam',x.id))).join('')||'<p>Add your exam dates, times, and venues.</p>')+
   '</section><section class="card"><div class="barhead"><h2>Subjects</h2>'+extraBtn('＋ Add subject','subject','','')+'</div>'+
   (extras.subjects.map(s=>row('<a class="subject-link" href="#exams/'+esc(s.id)+'"><b>'+esc(s.title)+' →</b><small>'+s.units.filter(u=>u.done).length+' / '+s.units.length+' syllabus items complete</small></a>',extraBtn('Edit','subject',s.id)+extraBtn('Remove','removeSubject',s.id))).join('')||'<p>Add a subject to build its syllabus checklist.</p>')+'</section></div>';
  return true;
 }
 const date=dietDay||today;
 const daily=extras.meals.filter(m=>m.date===date), totals=total(daily);
 $('view').innerHTML=title('Diet','Log servings and see how your daily nutrition adds up.',extraBtn('＋ Add food','meal','',''))+
  '<label class="day-picker">Log date<input id="dietDate" type="date" max="'+today+'" value="'+esc(date)+'"></label>'+
  '<div class="stats nutrition">'+totals.map((n,i)=>'<div class="card stat"><b>'+amount(n)+'</b><small>'+['Calories (kcal)','Protein (g)','Carbs (g)','Fat (g)'][i]+'</small></div>').join('')+'</div>'+
  '<div class="grid">'+card('Meals',groups.map(g=>'<h3 class="meal-group">'+g+'</h3>'+
   (daily.filter(m=>m.group===g).map(m=>row('<b>'+esc(m.title)+'</b><small>'+esc(m.quantity+' × '+m.serving+' · '+macros(total([m])))+'</small>',extraBtn('Edit','meal',m.id)+extraBtn('Remove','removeMeal',m.id))).join('')||'<p>No foods logged.</p>')).join(''))+
  card('Previous two days',[1,2].map(n=>{const d=shift(new Date(date+'T12:00:00'),-n),k=dateKey(d),logs=extras.meals.filter(m=>m.date===k);return row('<b>'+fmt(d,{weekday:'short',day:'numeric',month:'short'})+'</b><small>'+(logs.length?macros(total(logs)):'No foods logged')+'</small>')}).join('')+
  '<p class="estimate">Portions and macros are estimates. Recipes, serving sizes, and protein powder labels vary. Use Custom food to enter nutrition from a package or recipe.</p><p><a class="subject-link" href="https://www.nin.res.in/downloads/DietaryGuidelinesforNINwebsite.pdf" target="_blank" rel="noopener">ICMR–NIN serving reference ↗</a></p>')+'</div>';
 return true;
}
function extraEditor(label,fields,handler){
 $('fields').oninput=null;
 $('formTitle').textContent=label;
 $('fields').innerHTML=fields;
 submitForm=()=>{
  const entry=Object.fromEntries(new FormData($('form')));
  for(const key of Object.keys(entry))entry[key]=entry[key].trim();
  if(!handler(entry))return;
  saveExtras();$('dialog').close();render();
 };
 $('dialog').showModal();
}
function upsert(items,id,data){
 const index=items.findIndex(item=>item.id===id);
 if(index<0)items.push({...data,id:uid()});else items[index]={...items[index],...data};
 return true;
}
async function extraAction(action){
 const [mode,id]=action.split('~');
 const [subjectId,unitId]=(id||'').split('/');
 const subject=extras.subjects.find(s=>s.id===subjectId);
 if(mode==='import')return importLocal();
 if(mode==='sync')return sendWorkspace();
 if(mode==='export')return exportWorkspace();
 if(mode==='deleteWorkspace')return deleteWorkspace();
 if(mode==='clearGuest')return clearGuest();
 if(mode==='install'&&installPrompt){await installPrompt.prompt();installPrompt=null;render();return;}
 if(mode==='name')return extraEditor('Edit display name',input('Display name','title',extras.name),e=>{if(!e.title)return false;extras.name=e.title;return true});
 if(mode==='subject')return extraEditor(id?'Edit subject':'Add subject',input('Subject name','title',subject?.title),e=>e.title&&upsert(extras.subjects,id,{title:e.title,...(id?{}:{units:[]})}));
 if(mode==='exam'){
  if(!extras.subjects.length)return extraAction('subject');
  const x=extras.exams.find(x=>x.id===id)||{};
  return extraEditor(id?'Edit exam':'Add exam',menu('Subject','subject',extras.subjects.map(s=>[s.id,s.title]),x.subject)+input('Exam date','date',x.date,'required type="date"')+
   input('Start time','time',x.time,'type="time"')+input('Venue (optional)','location',x.location,'maxlength="100"'),e=>upsert(extras.exams,id,e));
 }
 if(mode==='unit'||mode==='editUnit'){
  const unit=subject.units.find(u=>u.id===unitId);
  return extraEditor(unit?'Edit syllabus item':'Add syllabus item',input('Unit or topic','title',unit?.title,'required maxlength="100" placeholder="Unit 3 — Normalization"')+
   '<label>Notes (optional)<textarea name="notes" maxlength="2000">'+esc(unit?.notes)+'</textarea></label>',
   e=>e.title&&upsert(subject.units,unitId,{...e,done:unit?.done||false}));
 }
 if(mode==='meal'){
  const meal=extras.meals.find(m=>m.id===id)||{}, date=dietDay||dateKey(new Date());
  extraEditor(id?'Edit food':'Add food',menu('Meal','group',groups.map(g=>[g,g]),meal.group)+input('Date','date',meal.date||date,'required type="date" max="'+dateKey(new Date())+'"')+
   menu('Food','food',[['','Select food'],...foods.map((f,i)=>[i,f[0]+' · '+f[1]]),['custom','Custom food']],meal.food)+
   input('Number of servings','quantity',meal.quantity||1,'required type="number" min="0.01" max="10000" step="any"')+
   '<div id="customMacros">'+input('Food name','title',meal.title)+input('Serving size','serving',meal.serving,'required maxlength="100" placeholder="100 g or 1 bowl"')+
   ['Calories (kcal)','Protein (g)','Carbs (g)','Fat (g)'].map((n,i)=>input(n+' per serving','n'+i,meal.nutrients?.[i],'required type="number" min="0" step="any" max="10000"')).join('')+'</div><p id="mealPreview" aria-live="polite"></p>',e=>{
    if(!e.food)return false;
    const [name,serving,...nutrients]=e.food==='custom'?[e.title,e.serving,...[0,1,2,3].map(i=>Number(e['n'+i]))]:foods[Number(e.food)];
    if(!name||!serving)return false;
    dietDay=e.date===dateKey(new Date())?'':e.date;
    return upsert(extras.meals,id,{date:e.date,group:e.group,food:e.food,title:name,serving,nutrients,quantity:Number(e.quantity)});
   });
  const form=$('form'), fields=$('fields');
  const preview=()=>{
   const food=form.elements.food.value, custom=food==='custom';
   $('customMacros').hidden=!custom;
   $('customMacros').querySelectorAll('input').forEach(i=>i.disabled=!custom);
   const nutrients=custom?[0,1,2,3].map(i=>Number(form.elements['n'+i].value)):foods[food]?.slice(2);
   $('mealPreview').textContent=nutrients?macros(nutrients.map(n=>n*Number(form.elements.quantity.value))):'Choose a food to calculate nutrition.';
  };
  form.elements.food.required=true;
  fields.oninput=preview;preview();return;
 }
 if(mode.startsWith('remove')&&confirm(mode==='removeSubject'?'Remove this subject, its syllabus and its exam dates?':'Remove this entry?')){
  if(mode==='removeSubject'){extras.subjects=extras.subjects.filter(s=>s.id!==id);extras.exams=extras.exams.filter(x=>x.subject!==id)}
  if(mode==='removeExam')extras.exams=extras.exams.filter(x=>x.id!==id);
  if(mode==='removeUnit')subject.units=subject.units.filter(u=>u.id!==unitId);
  if(mode==='removeMeal')extras.meals=extras.meals.filter(m=>m.id!==id);
  saveExtras();render();
 }
}
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='dietDate'&&el.value&&el.validity.valid){dietDay=el.value===dateKey(new Date())?'':el.value;render()}
 if(el.matches('[data-unit]')){
  const unit=extras.subjects.find(s=>s.id===el.dataset.subject).units.find(u=>u.id===el.dataset.unit);
  unit.done=el.checked;saveExtras();
  render();
  document.querySelector('[data-unit="'+CSS.escape(unit.id)+'"]').focus();
 }
});
