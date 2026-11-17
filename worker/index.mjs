import assets from './assets.js';
import './validate.mjs';

const maxSize = 2_000_000;
const headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json = (body, status = 200) => Response.json(body, {status, headers});

async function accountScope(user) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('prep-desk:' + user));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('');
}

async function readBody(request) {
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8',{fatal:true});
  let raw = '', size = 0;
  while (true) {
    const {value,done} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxSize) {
      await reader.cancel();
      return null;
    }
    raw += decoder.decode(value,{stream:true});
  }
  return JSON.parse(raw + decoder.decode());
}

async function workspace(request, env, user) {
  if (!user) return json({error:'Sign in to sync your workspace.'},401);
  const scope = await accountScope(user);
  const current = async () => {
    const row = await env.DB.prepare('SELECT revision, generation, mutation, payload FROM workspace WHERE user_id = ?').bind(user).first();
    return row ? {scope, revision:row.revision, generation:row.generation, mutation:row.mutation, entries:JSON.parse(row.payload)}
      : {scope, revision:0, generation:0, mutation:null, entries:{}};
  };
  if (request.method === 'GET') return json(await current());
  const deleting = request.method === 'DELETE';
  if (request.method !== 'PUT' && !deleting) return json({error:'Method not allowed.'},405);
  if (request.headers.get('Origin') !== new URL(request.url).origin ||
      request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({error:'Use the workspace from its own Site.'},403);
  }
  let body;
  try { body = await readBody(request); }
  catch { return json({error:'Invalid workspace data.'},400); }
  if (body === null) return json({error:'Empty or oversized request.'},400);
  const {revision,generation,mutation,entries} = body ?? {};
  if (!Number.isSafeInteger(revision) || revision < 0 || !Number.isSafeInteger(generation) ||
      generation < 0 || !id(mutation) || (!deleting && !validEntries(entries))) {
    return json({error:'Invalid workspace data.'},400);
  }
  if (body.scope !== scope) return json({error:'Your signed-in account changed.'},403);

  const nextGeneration = generation + Number(deleting);
  const payload = deleting ? '{}' : JSON.stringify(entries);
  // A deletion leaves a revision and generation marker but no workspace records.
  const statement = revision === 0 && generation === 0
    ? env.DB.prepare('INSERT OR IGNORE INTO workspace (user_id, revision, generation, mutation, payload) VALUES (?, 1, ?, ?, ?)')
      .bind(user,nextGeneration,mutation,payload)
    : env.DB.prepare('UPDATE workspace SET revision = revision + 1, generation = ?, mutation = ?, payload = ? WHERE user_id = ? AND revision = ? AND generation = ?')
      .bind(nextGeneration,mutation,payload,user,revision,generation);
  const result = await statement.run();
  if (result.meta.changes) return json({scope,revision:revision+1,generation:nextGeneration,mutation,entries:deleting?{}:entries});

  const latest = await current();
  if (latest.mutation === mutation && latest.revision === revision+1 && latest.generation === nextGeneration && JSON.stringify(latest.entries) === payload) return json(latest);
  return json(latest,409);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const user = request.headers.get('oai-authenticated-user-id');
    if (url.pathname === '/api/workspace') {
      try { return await workspace(request,env,user); }
      catch { return json({error:'Workspace sync is temporarily unavailable.'},503); }
    }
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers});
    const guest = url.searchParams.get('guest') === '1';
    const path = url.pathname === '/' ? (user || guest ? '/index.html' : '/welcome.html') : url.pathname;
    const asset = Object.hasOwn(assets,path) ? assets[path] : null;
    if (!asset || (path === '/index.html' && !user && !guest)) return new Response('Not found',{status:404,headers});
    let data = asset.binary ? Uint8Array.from(atob(asset.data), c => c.charCodeAt(0)) : asset.data;
    if (path === '/index.html' && user && !guest) {
      data = data.replace('name="workspace-scope" content=""','name="workspace-scope" content="'+await accountScope(user)+'"');
    }
    return new Response(request.method === 'HEAD' ? null : data,{headers:{...headers,'Content-Type':asset.type}});
  }
};
