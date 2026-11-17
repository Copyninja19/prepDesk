import assert from 'node:assert/strict';
import {test} from 'node:test';
import worker from '../dist/server/index.js';
import {openDatabase, migrate, bind} from './database.mjs';

const origin = 'https://prep.test';
const main = 'prep-desk-v1', extra = 'prep-desk-college-diet-v1';
const example = {
  [main]: {stack:'Node',goal:5,queue:[{id:'task-1',type:'DSA',topic:'Graphs',title:'Study',minutes:10}],
    logs:[{id:'log-1',type:'DSA',topic:'Graphs',title:'Study',minutes:8,date:'2025-02-28',notes:''}]},
  [extra]: {name:'A',subjects:[{id:'sub-1',title:'Science',units:[{id:'unit-1',title:'Chapter',done:false,notes:''}]}],
    exams:[{id:'exam-1',subject:'sub-1',date:'2025-03-01',time:'09:00',location:''}],
    meals:[{id:'meal-1',group:'Lunch',food:'1',title:'Rice',serving:'Cup',date:'2025-03-01',quantity:1,nutrients:[1,2,3,4]}]}
};
function setup(DB=openDatabase()) {
  return (path='/api/workspace',user='alice',method='GET',body,overrides={})=>
    worker.fetch(new Request(origin+path,{method,headers:{
      ...(user?{'oai-authenticated-user-id':user}:{}),...(body?{Origin:origin,'Content-Type':'application/json'}:{}),...overrides
    },body:body&&(typeof body==='string'?body:JSON.stringify(body))}),{DB});
}
const next = ({scope,revision,generation},entries,mutation=crypto.randomUUID())=>({scope,revision,generation,entries,mutation});
const read = async (request,user) => (await request(undefined,user)).json();

test('anonymous access, private cache headers, sign-in page and guest mode',async()=>{
  const request=setup();
  for(const method of ['GET','PUT','DELETE']){
    const response=await request(undefined,null,method);
    assert.equal(response.status,401);
    assert.match(response.headers.get('cache-control'),/no-store/);
  }
  assert.match(await (await request('/',null)).text(),/Sign in with ChatGPT/);
  assert.match(await (await request('/?guest=1',null)).text(),/desktopNav/);
  assert.equal((await request('/index.html',null)).status,404);
  assert.match(await (await request('/')).text(),/workspace-scope" content="[a-f0-9]{64}"/);
  assert.equal((await request('/InterVariable.woff2',null)).headers.get('content-type'),'font/woff2');
});

test('owner comes from authenticated identity for reads, writes and deletes',async()=>{
  const request=setup();
  const alice=await read(request,'alice'), bob=await read(request,'bob');
  assert.notEqual(alice.scope,bob.scope);
  const attempt={...next(alice,example),user_id:'bob'};
  assert.equal((await request(undefined,'bob','PUT',attempt)).status,403);
  assert.equal((await request(undefined,'alice','PUT',attempt)).status,200);
  assert.deepEqual((await read(request,'alice')).entries,example);
  assert.deepEqual((await read(request,'bob')).entries,{});
  assert.equal((await request(undefined,'bob','DELETE',attempt)).status,403);
  assert.deepEqual((await read(request,'alice')).entries,example);
});

test('rejects cross-origin and malformed bodies and nested records',async()=>{
  const request=setup();
  const alice=await read(request);
  for(const method of ['PUT','DELETE']){
    for(const Origin of ['https://elsewhere.test','null','']){
      assert.equal((await request(undefined,'alice',method,next(alice,example),{Origin})).status,403);
    }
  }
  for(const raw of ['{','null',JSON.stringify({padding:'a'.repeat(2_000_000)})]){
    assert.equal((await request(undefined,'alice','PUT',raw)).status,400);
  }
  for(const change of [
    x=>x[main].queue[0].minutes='10',x=>x[main].logs[0].date='2025-02-29',
    x=>x[extra].subjects[0].units[0].done='false', x=>x[extra].exams[0].subject='other',
    x=>x[extra].meals[0].nutrients.pop(), x=>x[extra].name={},
    x=>x[main].queue.push(x[main].queue[0]),x=>x.unexpected={}
  ]){
    const entries=structuredClone(example);
    change(entries);
    assert.equal((await request(undefined,'alice','PUT',next(alice,entries))).status,400);
  }
  assert.equal((await read(request)).revision,0);
});

test('CAS prevents lost writes; replay acknowledges a lost response; deletion rejects stale and pre-creation tabs',async()=>{
  const request=setup();
  const initial=await read(request);
  const save=next(initial,example);
  const response=await request(undefined,'alice','PUT',save);
  const first=await response.json();
  assert.equal(first.revision,1);
  assert.deepEqual(await (await request(undefined,'alice','PUT',save)).json(),first);
  assert.equal((await request(undefined,'alice','PUT',next(initial,{}))).status,409);
  const deletion=next(first,undefined);
  const deleted=await (await request(undefined,'alice','DELETE',deletion)).json();
  assert.equal(deleted.generation,1);
  assert.deepEqual(deleted.entries,{});
  assert.deepEqual(await (await request(undefined,'alice','DELETE',deletion)).json(),deleted);
  for(const stale of [save,next(first,example),next(initial,example)]){
    const response=await request(undefined,'alice','PUT',stale);
    assert.equal(response.status,409);
    assert.deepEqual(await response.json(),deleted);
  }
  assert.equal((await request(undefined,'alice','PUT',next(deleted,example))).status,200);
  assert.deepEqual((await read(request)).entries,example);
});

test('existing database records remain readable and writable after migration',async()=>{
  const sqlite=openDatabase(':memory:',true);
  sqlite.prepare('INSERT INTO workspace VALUES (?,?,?)').run('alice',8,JSON.stringify(example));
  migrate(sqlite);
  const request=setup(bind(sqlite));
  const before=await read(request);
  assert.equal(before.generation,0);
  assert.deepEqual(before.entries,example);
  assert.equal((await request(undefined,'alice','PUT',next(before,example))).status,200);
  assert.equal((await read(request)).revision,9);
});
