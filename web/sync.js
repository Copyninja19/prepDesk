const guestMode=new URLSearchParams(location.search).get('guest')==='1';
const syncKeys=['prep-desk-v1','prep-desk-college-diet-v1'];
const scope=document.querySelector('meta[name="workspace-scope"]').content;
const draftPrefix='prep-desk:draft:'+scope+':';
const draftKey=draftPrefix+crypto.randomUUID();
const resumeKey='prep-desk:resume:'+scope;
const guestEpochKey='prep-desk:guest-epoch';
const guestEpoch=readLocal(guestEpochKey,0);
const guestKey=(key,epoch=guestEpoch)=>epoch?'guest:'+epoch+':'+key:'guest:'+key;
let workspaceEntries={};
let remote=null;
let draft=null;
let conflict=null;
let busy=false;
let blocked=false;
let durable=true;
let statusMessage='Connecting to your account…';

function setWorkspaceStatus(message){
 statusMessage=message;
 document.querySelector('.storage').textContent=message;
 showRecovery();
}
function savedDrafts(){
 const drafts=[];
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(key?.startsWith(draftPrefix)&&key!==draftKey){
    const saved=readLocal(key);
    if(saved?.entries&&saved.base)drafts.push([key,saved]);
   }
  }
 }catch{}
 return drafts;
}
function saveDraft(){
 durable=writeLocal(draftKey,draft);
 if(durable){
  try{sessionStorage.setItem(resumeKey,draftKey)}catch{}
 }
 return durable;
}
function removeLocal(key){
 try{localStorage.removeItem(key);return true}catch{return false}
}
function clearDraft(){
 draft=null;
 conflict=null;
 durable=true;
 removeLocal(draftKey);
}
function snapshot(data){
 return {revision:data.revision,generation:data.generation,entries:data.entries};
}
function workspaceRead(key){
 const value=guestMode?readLocal(guestKey(key)):workspaceEntries[key];
 return value?structuredClone(value):null;
}
function workspaceWrite(key,value){
 if(guestMode){
  if(readLocal(guestEpochKey,0)!==guestEpoch){
   setWorkspaceStatus('Guest data was cleared in another tab. Reload to start a new workspace.');
   return false;
  }
  return writeLocal(guestKey(key),value);
 }
 if(!remote)return false;
 const entries={...workspaceEntries,[key]:structuredClone(value)};
 workspaceEntries=entries;
 draft ??= {base:snapshot(remote),flight:null,conflict:null};
 draft.entries=entries;
 draft.changedAt=Date.now();
 saveDraft();
 setWorkspaceStatus(!durable?'Draft could not be saved in this browser. Download your edits before leaving.'
  :blocked?'Sign-in changed. Edits are saved locally for the original account.'
  :conflict?'Sync needs attention. Review your draft and the saved workspace.':'Changes pending sync.');
 void sendWorkspace();
 return durable;
}
const same=(a,b)=>{
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));
};

async function requestWorkspace(method='GET',body){
 const response=await fetch('/api/workspace',{
  method,cache:'no-store',signal:AbortSignal.timeout(12000),
  ...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,scope})}:{})
 });
 if(response.status===401||response.status===403){
  blocked=true;
  throw Error('Sign-in changed. Reload to reconnect. Saved drafts stay with the original account.');
 }
 if(response.status===400)throw Error('Workspace data was rejected. Export your edits before making further changes.');
 if(!response.ok&&response.status!==409)throw Error('Changes pending sync. Reconnect or retry from Profile.');
 const data=await response.json();
 if(data.scope!==scope){
  blocked=true;
  throw Error('Sign-in changed. Reload to reconnect. Saved drafts stay with the original account.');
 }
 return {data,collision:response.status===409};
}
function needAttention(latest){
 remote=latest;
 conflict=latest;
 draft.conflict=latest;
 saveDraft();
 setWorkspaceStatus((draft.base.generation===latest.generation
  ?'Sync needs attention. Review your draft and the saved workspace.'
  :'This workspace was deleted. You can download or discard your older draft.')+
  (durable?'':' This browser could not store your draft.'));
}
async function sendWorkspace(){
 if(guestMode||blocked||busy||!draft||conflict)return;
 busy=true;
 setWorkspaceStatus('Syncing changes…');
 try{
  while(draft){
   draft.flight ??= {revision:draft.base.revision,generation:draft.base.generation,
    mutation:crypto.randomUUID(),entries:draft.entries};
   saveDraft();
   const flight=draft.flight;
   const {data,collision}=await requestWorkspace('PUT',flight);
   if(collision&&!(data.generation===flight.generation&&same(data.entries,flight.entries))){
    if(data.generation===draft.base.generation&&same(data.entries,draft.base.entries)){
     remote=data;
     draft.base=snapshot(data);
     draft.flight=null;
     saveDraft();
     continue;
    }
    needAttention(data);
    return;
   }
   remote=data;
   if(same(draft.entries,flight.entries)){
    clearDraft();
   }else{
    draft.base=snapshot(data);
    draft.flight=null;
    saveDraft();
   }
  }
  setWorkspaceStatus('Workspace saved.');
 }catch(error){
  setWorkspaceStatus(error.message+(durable?'':' This browser could not store your draft.'));
 }finally{
  busy=false;
  showRecovery();
 }
}
function canImportLocal(){
 return !guestMode&&remote?.revision===0&&!draft&&!busy&&
  syncKeys.some(key=>readLocal(key)||readLocal(guestKey(key)));
}
function importLocal(){
 if(!canImportLocal())return;
 for(const key of syncKeys){
  const local=readLocal(key)||readLocal(guestKey(key));
  if(local)workspaceWrite(key,local);
 }
}
function downloadData(data,filename){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const link=document.createElement('a');
 link.href=url;
 link.download=filename;
 link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function exportWorkspace(){
 if(guestMode){
  downloadData({guest:Object.fromEntries(syncKeys.map(key=>[key,readLocal(guestKey(key))]).filter(([,value])=>value))},'prep-desk-guest.json');
  return;
 }
 let saved=remote;
 try{saved=(await requestWorkspace()).data}catch(error){
  if(blocked){setWorkspaceStatus(error.message);return}
  setWorkspaceStatus('Export includes the last known saved version because the server is unavailable.');
 }
 downloadData({saved:saved?.entries??null,localDraft:draft?.entries??null,
  otherDrafts:savedDrafts().map(([,value])=>value.entries)},'prep-desk-data.json');
}
function clearGuest(){
 if(!confirm('Clear guest tasks, activity, exams, meals and profile from this browser?'))return;
 const previous=readLocal(guestEpochKey,0);
 if(!writeLocal(guestEpochKey,crypto.randomUUID()))return;
 if(!syncKeys.map(key=>removeLocal(guestKey(key,previous))).every(Boolean)){
  setWorkspaceStatus('Guest data could not be cleared. Check your browser storage settings.');
  return;
 }
 if(guestMode)location.reload();
 else setWorkspaceStatus('Guest data cleared in this browser.');
}
async function deleteWorkspace(){
 if(guestMode||!remote||blocked||busy||
    !confirm('Delete your synced workspace and its drafts in this browser? This cannot be undone.'))return;
 busy=true;
 const deletion={revision:remote.revision,generation:remote.generation,mutation:crypto.randomUUID()};
 try{
  let result;
  try{result=await requestWorkspace('DELETE',deletion)}
  catch(error){
   if(blocked)throw error;
   result=await requestWorkspace('DELETE',deletion);
  }
  const {data,collision}=result;
  if(collision){
   if(draft)needAttention(data);
   else{remote=data;setWorkspaceStatus('The saved workspace changed. Review it before trying deletion again.');}
   return;
  }
  clearDraft();
  for(const [key] of savedDrafts())removeLocal(key);
  location.reload();
 }catch(error){setWorkspaceStatus(error.message)}
 finally{busy=false;showRecovery()}
}
function showRecovery(){
 const panel=document.getElementById('recovery');
 if(guestMode||!scope||!panel)return;
 const others=savedDrafts();
 panel.hidden=!draft&&!others.length;
 const controls=panel.querySelector('[data-recovery-controls]');
 const entries=[];
 const button=(label,action)=>{
  const element=document.createElement('button');
  element.type='button';
  element.className='plain';
  element.textContent=label;
  element.onclick=action;
  entries.push(element);
 };
 if(draft&&conflict){
  button('Download both versions',()=>downloadData({
   base:draft.base.entries,draft:draft.entries,saved:conflict.entries
  },'prep-desk-recovery.json'));
  if(!busy&&!blocked&&draft.base.generation===conflict.generation){
   button('Replace saved with my draft',()=>{
    if(!confirm('Replace the saved workspace with your draft? Download both versions first if you need to keep the other device’s changes.'))return;
    draft.base=snapshot(conflict);
    draft.flight=null;
    draft.conflict=null;
    conflict=null;
    saveDraft();
    void sendWorkspace();
   });
  }
  if(!busy)button('Discard my draft',()=>{
   if(confirm('Discard edits from this draft and reload the saved workspace?')){
    clearDraft();
    location.reload();
   }
  });
 }else if(draft){
  button('Download draft',()=>downloadData(draft.entries,'prep-desk-draft.json'));
  if(!busy&&!blocked)button('Retry sync',sendWorkspace);
 }
 for(const [key,saved] of others){
  const date=new Date(saved.changedAt).toLocaleString();
  button('Download draft · '+date,()=>downloadData(saved.entries,'prep-desk-draft.json'));
  if(!busy&&!draft&&!blocked&&remote&&saved.base.generation===remote.generation){
   button('Open draft · '+date,()=>{
    try{sessionStorage.setItem(resumeKey,key);location.reload()}
    catch{setWorkspaceStatus('Could not open this draft. You can still download it.')}
   });
  }
  button('Discard draft · '+date,()=>{
   if(confirm('Remove this local draft?')){removeLocal(key);showRecovery()}
  });
 }
 const focus=document.activeElement;
 const focusedLabel=controls.contains(focus)?focus.textContent:null;
 controls.replaceChildren(...entries);
 if(focusedLabel)(entries.find(button=>button.textContent===focusedLabel)??panel).focus();
}
window.addEventListener('storage',event=>{
 if(guestMode&&(event.key===guestEpochKey||event.key===null))location.reload();
 if(!guestMode&&(event.key?.startsWith(draftPrefix)||event.key===null))showRecovery();
});
window.addEventListener('online',sendWorkspace);
window.addEventListener('beforeunload',event=>{
 if(draft&&!durable){event.preventDefault();event.returnValue=''}
});
async function startWorkspace(){
 if(guestMode){
  setWorkspaceStatus('Guest mode · Records stay in this browser.');
 }else{
  let saved;
  try{saved=sessionStorage.getItem(resumeKey)}catch{}
  if(saved?.startsWith(draftPrefix))draft=readLocal(saved);
  if(draft&&saveDraft()&&saved!==draftKey)removeLocal(saved);
  try{
   if(!scope)throw Error('Sign in to open your workspace.');
   remote=(await requestWorkspace()).data;
  }catch(error){
   if(!draft||blocked){
    setWorkspaceStatus(error.message);
    document.getElementById('view').innerHTML='<section class="card startup-error"><h1>Workspace unavailable</h1><p>Reload to reconnect to your account.</p><div class="recovery-actions"><a class="button-link" href="/">Reload workspace</a><a class="button-link" href="/?guest=1">Open guest workspace</a></div></section>';
    return;
   }
   remote=draft.conflict||draft.base;
  }
  workspaceEntries=draft?.entries??remote.entries;
  if(draft){
   if(remote.generation!==draft.base.generation||draft.conflict)needAttention(remote);
   else void sendWorkspace();
  }else setWorkspaceStatus('Workspace saved.');
 }
 for(const file of ['wellness','app','shell']){
  await new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='/'+file+'.js';
   script.onload=resolve;script.onerror=reject;
   document.body.append(script);
  });
 }
}
startWorkspace().catch(()=>setWorkspaceStatus('Could not start Prep Desk. Reload to retry.'));
