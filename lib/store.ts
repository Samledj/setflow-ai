'use client';
import { create } from 'zustand';
import { openDB } from 'idb';
import { Track,DJSet } from './types';
const db=()=>openDB('setflow-local',1,{upgrade(d){d.createObjectStore('state');}});
let queue=Promise.resolve();
function persist(key:string,value:unknown){const job=queue.then(async()=>{const d=await db();await d.put('state',value,key);});queue=job.catch(()=>{});return job;}
type Store={tracks:Track[];sets:DJSet[];active:DJSet|null;ready:boolean;storageError:string;hydrate:()=>Promise<void>;setLibrary:(t:Track[])=>Promise<void>;save:(s:DJSet)=>Promise<void>;open:(s:DJSet)=>void;remove:(id:string)=>Promise<void>};
export const useStore=create<Store>((set,get)=>({tracks:[],sets:[],active:null,ready:false,storageError:'',
 hydrate:async()=>{try{const d=await db();const [tracks,sets]=await Promise.all([d.get('state','tracks'),d.get('state','sets')]);set({tracks:tracks??[],sets:sets??[],ready:true});}catch{set({ready:true,storageError:'Stockage IndexedDB indisponible. Les modifications ne peuvent pas être conservées.'});}},
 setLibrary:async tracks=>{await persist('tracks',tracks);set({tracks,active:null});},
 save:async s=>{const sets=[s,...get().sets.filter(x=>x.id!==s.id)];set({sets,active:s});try{await persist('sets',sets);}catch{set({storageError:'Échec de sauvegarde locale. Exportez votre set pour le conserver.'});throw new Error('Échec de sauvegarde IndexedDB.');}},
 open:active=>set({active}),remove:async id=>{const sets=get().sets.filter(s=>s.id!==id);await persist('sets',sets);set({sets,active:get().active?.id===id?null:get().active});}
}));
