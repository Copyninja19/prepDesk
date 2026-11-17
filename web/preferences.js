const themeKey='prep-desk-theme';
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
function readLocal(key,fallback=null){
 try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}
}
function writeLocal(key,value){
 try{localStorage.setItem(key,JSON.stringify(value));return true}
 catch{
  const status=document.querySelector('.storage');
  if(status){status.setAttribute('role','status');status.textContent='Browser storage is unavailable. Changes may disappear when you reload.'}
  return false;
 }
}
function applyTheme(){
 const chosen=readLocal(themeKey,'system');
 const dark=chosen==='dark'||(chosen==='system'&&systemTheme.matches);
 document.documentElement.dataset.theme=dark?'dark':'light';
 document.querySelector('meta[name="theme-color"]').content=dark?'#101010':'#fafafa';
 const toggle=document.getElementById('themeToggle');
 if(toggle){
  toggle.textContent=dark?'☀':'☾';
  toggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
  toggle.title=toggle.getAttribute('aria-label');
 }
 const picker=document.getElementById('themePreference');
 if(picker)picker.value=chosen;
}
applyTheme();
systemTheme.addEventListener('change',applyTheme);
