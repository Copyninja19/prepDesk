import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {startPreview} from './preview.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PREP_DESK_PLAYWRIGHT || 'playwright-core');
const edge=process.env.PREP_DESK_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const route=(page,path)=>page.evaluate(hash=>location.hash=hash,path);
const visible=locator=>locator.waitFor({state:'visible'});
const click=(page,label)=>page.getByRole('button',{name:label,exact:true}).click();
const task=async(page,title)=>{
 await route(page,'queue');
 await click(page,'＋ Add task');
 await page.getByLabel('Topic or project').fill('Testing');
 await page.getByLabel('Title',{exact:true}).fill(title);
 await click(page,'Save');
 await visible(page.getByText(title,{exact:true}));
};
const status=(page,message)=>visible(page.getByRole('status').filter({hasText:message}));
const app=page=>visible(page.locator('#view h1'));

test('dashboard, timers, workspace pages, privacy and install assets at desktop and phone sizes in both themes',async()=>{
 const {server,url}=await startPreview();
 const browser=await chromium.launch({executablePath:edge});
 try{
  for(const viewport of [{width:1440,height:900},{width:375,height:812}]){
   for(const colorScheme of ['light','dark']){
    const page=await browser.newPage({viewport,colorScheme,acceptDownloads:true});
    const errors=[], external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(!request.url().startsWith(url))external.push(request.url())});
    await page.goto(url);
    await visible(page.getByRole('heading',{name:'Your study workspace'}));
    assert.equal(await page.getByRole('link',{name:'Sign in with ChatGPT'}).getAttribute('href'),'/signin-with-chatgpt?return_to=%2F');
    await page.getByRole('link',{name:'Continue as guest'}).click();
    await app(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'),colorScheme);
    const font=await page.evaluate(async()=>{await document.fonts.ready;return [...document.fonts].some(face=>face.family==='Inter'&&face.status==='loaded')});
    assert.equal(font,true);
    assert.match(await page.locator('#view h1').evaluate(el=>getComputedStyle(el).fontFamily),/^\"?Instrument Serif/);
    await visible(page.getByRole('heading',{name:'Your queue is clear'}));
    if(viewport.width<500){
     await visible(page.getByRole('navigation',{name:'Mobile workspace'}));
     await click(page,'More');
     await page.getByRole('link',{name:'Settings'}).filter({visible:true}).click();
     await visible(page.getByRole('heading',{name:'Settings',exact:true}));
    }else await visible(page.getByRole('navigation',{name:'Workspace',exact:true}));
    await route(page,'dashboard');
    await click(page,'Start');
    await click(page,'Pause');
    await click(page,'Reset');
    assert.equal(await page.locator('#clock').textContent(),'10:00');
    await task(page,'Long task '.repeat(12).trim());
    await route(page,'exams');
    await click(page,'＋ Add subject');
    await page.getByLabel('Subject name').fill('Calculus');
    await click(page,'Save');
    await click(page,'＋ Add exam');
    await page.getByLabel('Exam date').fill('2027-01-20');
    await click(page,'Save');
    await visible(page.getByText('2027-01-20'));
    await page.getByRole('link',{name:/Calculus/}).click();
    await click(page,'＋ Add syllabus item');
    await page.getByLabel('Unit or topic').fill('Limits');
    await click(page,'Save');
    const box=page.getByRole('checkbox',{name:'Limits'});
    await box.focus();
    await page.keyboard.press('Space');
    assert.equal(await box.isChecked(),true);
    assert.equal(await box.evaluate(el=>el===document.activeElement),true);
    await route(page,'diet');
    await click(page,'＋ Add food');
    await page.locator('select[name=food]').selectOption('1');
    await click(page,'Save');
    await visible(page.getByText('Cooked rice',{exact:true}));
    await click(page,'＋ Add food');
    await page.locator('select[name=food]').selectOption({label:'Whey protein shake with water · 1 scoop (about 30 g)'});
    await click(page,'Save');
    await visible(page.getByText('Whey protein shake with water',{exact:true}));
    await visible(page.getByRole('heading',{name:'Previous two days'}));
    for(const path of ['dashboard','queue','exams','diet','activity','settings','profile']){
     await route(page,path);
     await page.waitForFunction(expected=>location.hash==='#'+expected&&document.querySelector('#view h1')&&document.documentElement.scrollWidth<=innerWidth,path);
    }
    await visible(page.getByRole('heading',{name:'Privacy and data'}));
    const download=page.waitForEvent('download');
    await click(page,'Export my data');
    assert.equal((await download).suggestedFilename(),'prep-desk-guest.json');
    page.once('dialog',dialog=>dialog.accept());
    const cleared=page.waitForEvent('load');
    await click(page,'Clear guest data');
    await cleared;
    await app(page);
    await route(page,'exams');
    await visible(page.getByText('Add a subject to build its syllabus checklist.'));
    assert.deepEqual(errors,[]);
    assert.deepEqual(external,[]);
    const manifest=await (await page.request.get(url+'/manifest.webmanifest')).json();
    assert.equal(manifest.display,'standalone');
    for(const icon of manifest.icons)assert.equal((await page.request.get(url+icon.src)).ok(),true);
    await page.close();
   }
  }
 }finally{await browser.close();server.close()}
});

test('draft recovery after reload and lost response, isolation, concurrent edits and deletion',async()=>{
 const {server,url}=await startPreview();
 const browser=await chromium.launch({executablePath:edge});
 try{
  const page=await browser.newPage({acceptDownloads:true});
  const other=await browser.newPage();
  const bob=await browser.newPage();
  const login=(p,actor)=>p.goto(url+'/__test_signin?actor='+actor);
  await login(page,'alice');
  await app(page);
  await page.route('**/api/workspace',async r=>{
   if(r.request().method()!=='PUT')return r.continue();
   const committed=await r.fetch();
   assert.equal(committed.status(),200);
   await r.abort();
  });
  await task(page,'Lost acknowledgement');
  await status(page,/failed|pending/i);
  await page.unroute('**/api/workspace');
  await page.reload();
  await status(page,'Workspace saved.');
  await visible(page.getByText('Lost acknowledgement',{exact:true}));
  await page.route('**/api/workspace',r=>r.request().method()==='PUT'?r.abort():r.continue());
  await task(page,'Offline before commit');
  await status(page,/failed|pending/i);
  await page.reload();
  await visible(page.getByText('Offline before commit',{exact:true}));
  await page.unroute('**/api/workspace');
  await click(page,'Retry sync');
  await status(page,'Workspace saved.');
  await login(other,'alice');
  await app(other);
  await task(other,'Other device change');
  await status(other,'Workspace saved.');
  await task(page,'Local conflict draft');
  await status(page,'Sync needs attention');
  await page.reload();
  await status(page,'Sync needs attention');
  const file=page.waitForEvent('download');
  await click(page,'Download both versions');
  assert.equal((await file).suggestedFilename(),'prep-desk-recovery.json');
  page.once('dialog',d=>d.accept());
  await click(page,'Replace saved with my draft');
  await status(page,'Workspace saved.');
  await other.reload();
  await visible(other.getByText('Local conflict draft',{exact:true}));
  assert.equal(await other.getByText('Other device change',{exact:true}).count(),0);
  await task(page,'Deleted workspace stale draft');
  await status(page,'Workspace saved.');
  await other.reload();
  await app(other);
  await login(bob,'bob');
  await app(bob);
  await route(bob,'queue');
  assert.equal(await bob.getByText('Local conflict draft',{exact:true}).count(),0);
  await page.route('**/api/workspace',r=>r.request().method()==='PUT'?r.abort():r.continue());
  await task(page,'Unsynced before deletion');
  await status(page,/failed|pending/i);
  await route(other,'profile');
  other.once('dialog',d=>d.accept());
  const reload=other.waitForEvent('load');
  await click(other,'Delete my workspace');
  await reload;
  await app(other);
  await page.reload();
  await status(page,'This workspace was deleted');
  assert.equal(await page.getByRole('button',{name:'Replace saved with my draft'}).count(),0);
  await route(other,'queue');
  assert.equal(await other.getByText('Other device change',{exact:true}).count(),0);
 }finally{await browser.close();server.close()}
});
