const routes=[
 ['dashboard','Home','▦','Dashboard'],
 ['queue','Tasks','☷','Next tasks'],
 ['exams','Exams','▤','Exams'],
 ['diet','Diet','🍴︎','Diet'],
 ['activity','Activity','◷','Activity log'],
 ['profile','Profile','◎','Profile'],
 ['settings','Settings','⚙','Settings']
];
function navLink([path,short,icon,long],compact=false){
 return '<a href="#'+path+'"><span aria-hidden="true">'+icon+'</span><span>'+ (compact?short:long)+'</span></a>';
}
$('desktopNav').innerHTML=routes.map(r=>navLink(r)).join('');
$('mobileNav').innerHTML=routes.slice(0,4).map(r=>navLink(r,true)).join('')+'<button type="button" id="openMore" aria-haspopup="dialog"><span aria-hidden="true">•••</span><span>More</span></button>';
$('moreNav').innerHTML=routes.slice(4).map(r=>navLink(r)).join('');
$('openMore').onclick=()=>$('moreMenu').showModal();
$('closeMore').onclick=()=>$('moreMenu').close();
$('moreNav').addEventListener('click',event=>{if(event.target.closest('a'))$('moreMenu').close()});
$('themeToggle').onclick=()=>{
 writeLocal(themeKey,document.documentElement.dataset.theme==='dark'?'light':'dark');
 applyTheme();
};
document.addEventListener('change',event=>{
 if(event.target.id==='themePreference'){
  writeLocal(themeKey,event.target.value);
  applyTheme();
 }
});
window.addEventListener('hashchange',()=>window.scrollTo(0,0));
render();
