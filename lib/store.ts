'use client';
import { create } from 'zustand';
import { openDB } from 'idb';
import { Track,DJSet } from './types';
export type Account={id:string;username:string};
const db=()=>openDB('setflow-local',1,{upgrade(d){d.createObjectStore('state');}});
let queue=Promise.resolve();
function enqueue(job:()=>Promise<void>){const next=queue.then(job);queue=next.catch(()=>{});return next;}
async function local(key:string,value:unknown){const d=await db();await d.put('state',value,key);}
class RequestError extends Error{constructor(message:string,public status:number){super(message);}}
async function request(path:string,options?:RequestInit){const response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options?.headers}});let data;try{data=await response.json();}catch{throw new Error('Le service de comptes est indisponible. Rechargez la page ou réessayez.');}if(!response.ok)throw new RequestError(data.error||'Impossible de contacter votre espace.',response.status);return data;}
async function guestData(){const d=await db();return {tracks:(await d.get('state','tracks')??[]) as Track[],sets:(await d.get('state','sets')??[]) as DJSet[]};}
type Store={tracks:Track[];sets:DJSet[];active:DJSet|null;user:Account|null;ready:boolean;accountBusy:boolean;sessionExpired:boolean;storageError:string;syncStatus:'local'|'saving'|'saved'|'error';guestCount:number;hydrate:()=>Promise<void>;authenticate:(action:'login'|'register',username:string,password:string,remember:boolean,attachGuest:boolean)=>Promise<void>;linkEmail:(email:string,password:string)=>Promise<void>;logout:()=>Promise<void>;adoptGuest:()=>Promise<void>;retrySync:()=>Promise<void>;setLibrary:(t:Track[])=>Promise<void>;save:(s:DJSet)=>Promise<void>;open:(s:DJSet)=>void;remove:(id:string)=>Promise<void>};
export const useStore=create<Store>((set,get)=>{
 async function persist(patch:{tracks?:Track[];sets?:DJSet[]}){
  const user=get().user;set({syncStatus:user?'saving':'local',storageError:''});
  try{await enqueue(async()=>{
   if(user){await request('/api/workspace',{method:'PUT',body:JSON.stringify(patch)});for(const [key,value] of Object.entries(patch)){try{await local(`account:${user.id}:${key}`,value);}catch{/* Server remains the source of truth for accounts. */}}}
   else for(const [key,value] of Object.entries(patch))await local(key,value);
  });if(get().user?.id===user?.id)set({syncStatus:user?'saved':'local'});
  }catch(e){const message=e instanceof Error?e.message:'Échec de sauvegarde.';set({syncStatus:'error',storageError:message,sessionExpired:e instanceof RequestError&&e.status===401});throw e;}
 }
 return {tracks:[],sets:[],active:null,user:null,ready:false,accountBusy:false,sessionExpired:false,storageError:'',syncStatus:'local',guestCount:0,
 hydrate:async()=>{try{const auth=await request('/api/auth');if(auth.user){const data=await request('/api/workspace');let count=0;try{count=(await guestData()).tracks.length;}catch{}set({user:auth.user,tracks:data.tracks,sets:data.sets,ready:true,syncStatus:'saved',guestCount:count});}else{const data=await guestData();set({...data,user:null,ready:true,guestCount:data.tracks.length});}}catch(e){try{const data=await guestData();set({...data,guestCount:data.tracks.length});}catch{}set({ready:true,storageError:e instanceof Error?e.message:'Stockage indisponible.'});}},
 authenticate:async(action,username,password,remember,attachGuest)=>{
  if(get().sessionExpired&&get().user&&username.trim().toLowerCase()!==get().user!.username)throw new Error('Reconnectez-vous au même compte pour conserver vos modifications en attente.');
  set({accountBusy:true});try{await queue;const pending=get().sessionExpired?{tracks:get().tracks,sets:get().sets}:null;const guest=!get().user?{tracks:get().tracks,sets:get().sets}:await guestData();const auth=await request('/api/auth',{method:'POST',body:JSON.stringify({action,username,password,remember})});const remote=await request('/api/workspace');set({user:auth.user,tracks:remote.tracks,sets:remote.sets,active:null,storageError:'',syncStatus:'saved',sessionExpired:false,guestCount:guest.tracks.length});
   if(pending){await persist(pending);set(pending);}
   if(action==='register'&&attachGuest&&(guest.tracks.length||guest.sets.length)){await persist(guest);set({tracks:guest.tracks,sets:guest.sets});}
  }finally{set({accountBusy:false});}
 },
 linkEmail:async(email,password)=>{set({accountBusy:true});try{await queue;const result=await request('/api/auth',{method:'POST',body:JSON.stringify({action:'email',email,password})});set({user:result.user});}finally{set({accountBusy:false});}},
 logout:async()=>{if(get().syncStatus==='error')throw new Error('Sauvegardez vos modifications avec « Réessayer » avant de vous déconnecter.');set({accountBusy:true});try{await queue;await request('/api/auth',{method:'DELETE'});let guest={tracks:[] as Track[],sets:[] as DJSet[]};try{guest=await guestData();}catch{}set({...guest,user:null,active:null,sessionExpired:false,syncStatus:'local',storageError:'',guestCount:guest.tracks.length});}finally{set({accountBusy:false});}},
 adoptGuest:async()=>{if(!get().user||get().tracks.length)throw new Error('Importez le XML pour remplacer votre bibliothèque actuelle.');const guest=await guestData();await persist({tracks:guest.tracks});set({tracks:guest.tracks,active:null});},
 retrySync:async()=>{await persist({tracks:get().tracks,sets:get().sets});},
 setLibrary:async tracks=>{if(get().accountBusy)throw new Error('Connexion en cours. Patientez.');await persist({tracks});set({tracks,active:null,guestCount:get().user?get().guestCount:tracks.length});},
 save:async s=>{if(get().accountBusy)throw new Error('Connexion en cours. Patientez.');const sets=[s,...get().sets.filter(x=>x.id!==s.id)];set({sets,active:s});await persist({sets});},
 open:active=>set({active}),remove:async id=>{const sets=get().sets.filter(s=>s.id!==id);await persist({sets});set({sets,active:get().active?.id===id?null:get().active});}
 };
});
