import {createServer} from 'node:http';
import {once} from 'node:events';
import worker from '../dist/server/index.js';
import {openDatabase} from './database.mjs';

export async function startPreview(port=0){
 const DB=openDatabase();
 const server=createServer(async (incoming,outgoing)=>{
  try{
   const headers=new Headers(incoming.headers);
   headers.delete('oai-authenticated-user-id');
   const url=new URL(incoming.url,'http://127.0.0.1:'+server.address().port);
   if(url.pathname==='/__test_signin'){
    const actor=url.searchParams.get('actor');
    outgoing.writeHead(303,{'Location':'/','Set-Cookie':'preview_account='+(['alice','bob'].includes(actor)?actor:'')+'; Path=/; HttpOnly; SameSite=Lax'});
    return outgoing.end();
   }
   const actor=headers.get('cookie')?.match(/(?:^|; *)preview_account=(alice|bob)(?:;|$)/)?.[1];
   if(actor)headers.set('oai-authenticated-user-id',actor);
   const method=incoming.method;
   const body=['GET','HEAD'].includes(method)?{}:{body:incoming,duplex:'half'};
   const response=await worker.fetch(new Request(url,{method,headers,...body}),{DB});
   outgoing.writeHead(response.status,Object.fromEntries(response.headers));
   outgoing.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){
   outgoing.writeHead(500);
   outgoing.end('Preview request failed');
   console.error(error.message);
  }
 });
 server.listen(port,'127.0.0.1');
 await once(server,'listening');
 return {server,url:'http://127.0.0.1:'+server.address().port};
}

if(process.argv[2]==='--serve'){
 const {url}=await startPreview(8080);
 console.log('Local preview:',url);
}
