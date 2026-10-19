import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { POST as authPost, GET as authGet, DELETE as authDelete } from '../app/api/auth/route';
import { GET as workspaceGet, PUT as workspacePut } from '../app/api/workspace/route';
import { database, login, sessionAccount } from '../lib/server/accounts';
import { demoTracks } from '../lib/demo';
import { generate } from '../lib/engine';
import { defaults } from '../lib/types';
const folder=mkdtempSync(join(tmpdir(),'setflow-account-test-'));process.env.SETFLOW_DATA_DIR=folder;
after(()=>{database().close();rmSync(folder,{recursive:true,force:true});});
const origin='https://studio.example.test';
function req(path:string,method='GET',data?:unknown,cookie?:string,requestOrigin=origin){return new NextRequest(origin+path,{method,headers:{host:'studio.example.test','x-forwarded-proto':'https',origin:requestOrigin,'Content-Type':'application/json',...(cookie?{cookie}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});}
test('Accounts isolate libraries, retain metadata through logout/login and protect endpoints',async()=>{
 assert.equal((await workspaceGet(req('/api/workspace'))).status,401);
 const password='test-only-password-2026';
 const a=await authPost(req('/api/auth','POST',{action:'register',username:'dj-test-one',password,remember:true}));assert.equal(a.status,200);const aBody=await a.json();const cookie=a.headers.get('set-cookie')!.split(';')[0];assert.match(a.headers.get('set-cookie')!,/HttpOnly/i);assert.match(a.headers.get('set-cookie')!,/Secure/i);assert.match(a.headers.get('set-cookie')!,/Max-Age=2592000/);
 const row=database().prepare('SELECT password_hash FROM users WHERE id=?').get(aBody.user.id) as {password_hash:string};assert.notEqual(row.password_hash,password);assert.equal(row.password_hash.length,128);
 const lib=demoTracks();const set=generate(lib,{...defaults,minutes:30,genres:[]});const stored=await workspacePut(req('/api/workspace','PUT',{tracks:lib,sets:[set]},cookie));assert.equal(stored.status,200);let snapshot=await (await workspaceGet(req('/api/workspace','GET',undefined,cookie))).json();assert.equal(snapshot.tracks.length,50);assert.equal(snapshot.sets[0].id,set.id);
 const b=await authPost(req('/api/auth','POST',{action:'register',username:'dj-test-two',password,remember:false}));assert.equal(b.status,200);const cookieB=b.headers.get('set-cookie')!.split(';')[0];snapshot=await (await workspaceGet(req('/api/workspace','GET',undefined,cookieB))).json();assert.deepEqual(snapshot.tracks,[]);assert.deepEqual(snapshot.sets,[]);
 assert.equal((await workspacePut(req('/api/workspace','PUT',{tracks:[]},cookie,'https://attacker.example'))).status,403);
 assert.equal((await workspacePut(req('/api/workspace','PUT',{tracks:[{id:'bad'}]},cookie))).status,400);
 assert.equal((await authPost(req('/api/auth','POST',{action:'register',username:'DJ-TEST-ONE',password}))).status,409);
 assert.equal((await authDelete(req('/api/auth','DELETE',undefined,cookie))).status,200);assert.equal((await workspaceGet(req('/api/workspace','GET',undefined,cookie))).status,401);
 const logged=await authPost(req('/api/auth','POST',{action:'login',username:'DJ-TEST-ONE',password,remember:true}));assert.equal(logged.status,200);const newCookie=logged.headers.get('set-cookie')!.split(';')[0];snapshot=await (await workspaceGet(req('/api/workspace','GET',undefined,newCookie))).json();assert.equal(snapshot.tracks.length,50);assert.equal(snapshot.sets.length,1);assert.equal((await (await authGet(req('/api/auth','GET',undefined,newCookie))).json()).user.username,'dj-test-one');
 const token=newCookie.split('=')[1];database().prepare('UPDATE sessions SET expires_at=0 WHERE user_id=?').run(aBody.user.id);assert.equal(sessionAccount(token),null);
 const wrong=await authPost(req('/api/auth','POST',{action:'login',username:'dj-test-one',password:'incorrect-long-password'}));assert.equal(wrong.status,401);
});
test('Password policy, payload limits, CSRF and login rate limiting are enforced',async()=>{
 const short=await authPost(req('/api/auth','POST',{action:'register',username:'new-dj',password:'short'}));assert.equal(short.status,400);
 const csrf=await authPost(req('/api/auth','POST',{action:'register',username:'new-dj',password:'valid-test-password'},undefined,'https://evil.example'));assert.equal(csrf.status,403);
 const oversized=await authPost(req('/api/auth','POST',{action:'login',username:'new-dj',password:'x'.repeat(5000)}));assert.equal(oversized.status,413);
 let status=0;for(let i=0;i<16;i++)status=(await authPost(req('/api/auth','POST',{action:'login',username:'unknown-test-dj',password:'incorrect-test-password'}))).status;assert.equal(status,429);
});
