import { Track, Settings, DJSet } from './types';
const minor = ['Ab','Eb','Bb','F','C','G','D','A','E','B','F#','C#'];
const major = ['B','F#','C#','Ab','Eb','Bb','F','C','G','D','A','E'];
export function camelot(value: string): string | null {
 const raw = value.trim(); if (/^(?:[1-9]|1[0-2])[AB]$/i.test(raw)) return raw.toUpperCase();
 const v = raw.replace(/♯/g,'#').replace(/♭/g,'b').replace(/\s+/g,'').replace(/major$/i,'').replace(/minor$/i,'m');
 const m = /^([A-Ga-g])([#b]?)(m|maj|min)?$/.exec(v); if (!m) return null;
 let note = m[1].toUpperCase()+m[2]; const aliases: Record<string,string> = {'G#':'Ab','D#':'Eb','A#':'Bb','Db':'C#','Gb':'F#','Cb':'B','Fb':'E','E#':'F','B#':'C'}; note=aliases[note]||note;
 const isMinor = m[3]==='m'||m[3]==='min'; const i=(isMinor?minor:major).indexOf(note); return i<0?null:`${i+1}${isMinor?'A':'B'}`;
}
export function harmonic(a: string | null,b: string | null): number | null {
 if (!a||!b) return null; if(a===b)return 100;
 const n=Number(a.slice(0,-1)),m=Number(b.slice(0,-1)); if(n===m)return 95;
 const d=Math.min(Math.abs(n-m),12-Math.abs(n-m)); if(a.slice(-1)===b.slice(-1)&&d===1)return 90;
 if(a.slice(-1)===b.slice(-1)&&d===2)return 60; return 25;
}
export function energy(t: Track): number { return t.energy ?? Math.max(1,Math.min(10,Math.round((((t.bpm??118)-90)/6)*10)/10)); }
export function target(s:Settings,p:number):number {
 const points: Record<string,number[]> = {'Progressive':[3,4.5,6,7.5,9],'Slow Build':[2,2.5,4,6,8],'High Energy':[8,8.5,9,9,9],'Wave':[4,8,5,9,6],'Sunset':[3,4,6,7,5],'Constant Energy':[6,6,6,6,6],'Peak Time':[7,8,9,10,9],'Custom':s.custom};
 const a=points[s.profile]||points.Progressive; const x=Math.max(0,Math.min(1,p))*4; const i=Math.min(3,Math.floor(x)); let v=a[i]+(a[i+1]-a[i])*(x-i);
 const mood:Record<string,number>={Chill:-1.5,Elegant:-.8,Groovy:0,Sunset:-.5,Festive:.8,'High Energy':1.5,Underground:.3};
 v+=(mood[s.mood]??0); if(s.chillStart&&p<.3)v-=2*(1-p/.3); if(s.powerfulEnd&&p>.7)v+=2*(p-.7)/.3;
 if(s.boostAfter!==null&&p*s.minutes>=s.boostAfter)v+=1.7; return Math.max(1,Math.min(10,v));
}
export function transition(a:Track,b:Track) {
 const bpm=a.bpm!==null&&b.bpm!==null?Math.abs(a.bpm-b.bpm):null; const key=harmonic(a.camelot,b.camelot); const delta=Math.abs(energy(a)-energy(b));
 const level=(bpm!==null&&bpm>6)||(key!==null&&key<50)||delta>3?'Challenging':bpm===null||key===null||bpm>3||delta>1.8?'Moderate':'Smooth';
 return {bpm,key,delta,level,tip:level==='Smooth'?'Long Blend · Bass Swap':level==='Moderate'?'Filter Transition · Bass Swap':'Echo Out · transition courte'};
}
export function total(tracks:Track[]) {return tracks.reduce((v,t)=>v+(t.duration??0),0);}
export function applyDescription(s:Settings):Settings {
 const d=s.description.toLowerCase(); const next={...s};
 const match=d.match(/(\d+(?:[.,]\d+)?)\s*(hours?|heures?|h)\b/); const mins=d.match(/(\d+)\s*(minutes?|min)\b/);
 if(match)next.minutes=Math.min(720,Math.max(10,Number(match[1].replace(',','.'))*60)); else if(mins)next.minutes=Math.min(720,Math.max(10,Number(mins[1])));
 if(/beach|plage/.test(d))next.event='Beach Club'; else if(/wedding|mariage/.test(d))next.event='Wedding'; else if(/festival/.test(d))next.event='Festival';
 if(/progressiv/.test(d))next.profile='Progressive'; if(/chill|calme/.test(d))next.chillStart=true;
 const genres=['Afro House','Deep House','Melodic House','Tech House','Organic House']; const found=genres.filter(g=>d.includes(g.toLowerCase())); if(found.length)next.genres=found;
 return next;
}
export function generate(library:Track[],settings:Settings,previous?:DJSet):DJSet {
 const s=applyDescription(settings); const locks=previous?.tracks.filter(t=>previous.locked.includes(t.id))??[];
 if(locks.some(t=>!library.some(l=>l.id===t.id)))throw new Error('Un titre verrouillé est absent de la bibliothèque active.');
 let pool=library.filter(t=>t.duration!==null&&t.duration>0&&(!s.genres.length||s.genres.includes(t.genre)));
 const warnings:string[]=[]; if(!pool.length&&!locks.length)throw new Error('Aucun titre avec une durée connue dans ces genres. Importez votre XML ou sélectionnez d’autres genres.');
 const knownEnergy=pool.map(energy); const low=knownEnergy.length?Math.min(...knownEnergy):1; const high=knownEnergy.length?Math.max(...knownEnergy):10;
 if(high<8)warnings.push('Énergie cible adaptée à la plage disponible dans les genres sélectionnés ; consultez la courbe réelle du set.');
 const selected:Track[]=[]; const used=new Set<string>(); let elapsed=0; const goal=s.minutes*60;
 // Mandatory locked tracks are inserted near their former time position and survive genre changes.
 const pending=locks.map(t=>({track:t,position:(previous?.tracks.findIndex(p=>p.id===t.id)??0)/Math.max(1,previous?.tracks.length??1)}));
 while((elapsed<goal&&pool.some(t=>!used.has(t.id)))||pending.length){
  const p=elapsed/goal; const due=pending.findIndex(l=>l.position<=p||elapsed>=goal||!pool.some(t=>!used.has(t.id)));
  let chosen:Track|undefined;
  if(due>=0)chosen=pending.splice(due,1)[0].track;
  else {
   const last=selected.at(-1); let best=-Infinity;
   for(const t of pool){ if(used.has(t.id)||pending.some(l=>l.track.id===t.id))continue;
    const e=energy(t); const h=last?harmonic(last.camelot,t.camelot):null;
    const context=s.event==='Restaurant'?-1:s.event==='Festival'?1:0;
    const desired=low+(Math.max(1,Math.min(10,target(s,p)+context))-1)/9*(high-low);
    let score=40-Math.abs(e-desired)*9;
    if(last){score-=last.bpm!==null&&t.bpm!==null?Math.abs(last.bpm-t.bpm)*2.7:3; score+=(h??45)*.16; score-=Math.abs(e-energy(last))*1.5; if(last.artist===t.artist)score-=7;}
    score+=(t.rating??0)*.6; if(s.preferences&&`${t.artist} ${t.genre}`.toLowerCase().includes(s.preferences.toLowerCase()))score+=6;
    if((t.duration??0)>goal-elapsed)score-=Math.min(14,((t.duration??0)-(goal-elapsed))/40);
    // Small random tie-breaker gives regeneration useful alternatives without overpowering musical criteria.
    score+=Math.random()*2; if(score>best){best=score;chosen=t;}
   }
  }
  if(!chosen){if(pending.length){chosen=pending.shift()!.track;}else break;}
  if(used.has(chosen.id))continue; selected.push({...chosen});used.add(chosen.id);elapsed+=chosen.duration??0;
 }
 if(elapsed<goal)warnings.push(`Bibliothèque insuffisante : ${Math.floor(elapsed/60)} min disponibles pour ${s.minutes} min demandées.`);
 if(selected.some(t=>t.energy===null))warnings.push('Énergie estimée à partir du BPM pour les titres sans énergie manuelle. Ce n’est pas une analyse audio.');
 if(selected.some(t=>!t.camelot||t.bpm===null))warnings.push('Certaines tonalités ou valeurs BPM sont absentes ; les transitions correspondantes restent incertaines.');
 if(locks.length&&total(locks)>goal)warnings.push('Les titres verrouillés dépassent la durée demandée.');
 return {id:previous?.id??crypto.randomUUID(),name:s.name||'Untitled session',created:previous?.created??new Date().toISOString(),updated:new Date().toISOString(),settings:s,tracks:selected,locked:locks.map(t=>t.id),warnings};
}
export function replacement(set:DJSet,index:number,library:Track[]):DJSet {
 const old=set.tracks[index]; if(!old)throw new Error('Position de morceau invalide.'); if(set.locked.includes(old.id))throw new Error('Déverrouillez ce morceau avant de le remplacer.');
 const pool=library.filter(t=>t.duration&& !set.tracks.some(x=>x.id===t.id)&&(!set.settings.genres.length||set.settings.genres.includes(t.genre)));
 if(!pool.length)throw new Error('Aucun autre morceau disponible dans les genres sélectionnés.');
 const prev=set.tracks[index-1],next=set.tracks[index+1];
 pool.sort((a,b)=>{const score=(t:Track)=>Math.abs(energy(t)-energy(old))*4+(prev?(100-(harmonic(prev.camelot,t.camelot)??50))*.1+Math.abs((prev.bpm??120)-(t.bpm??120)):0)+(next?(100-(harmonic(t.camelot,next.camelot)??50))*.1:0);return score(a)-score(b);});
 const tracks=[...set.tracks];tracks[index]={...pool[0]};return {...set,tracks,updated:new Date().toISOString()};
}
export type Command={type:'replace';index:number}|{type:'chill'}|{type:'end'}|{type:'boost';minute:number}|{type:'genre';genre:string}|{type:'unknown'};
export function interpret(text:string):Command {
 const d=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
 if(/\b(?:don't|do not|ne .{0,40}pas)\b/.test(d))return {type:'unknown'};
 const r=d.match(/\b(?:replace|remplace\w*|change\w*)\s*(?:(?:le|la)\s*)?(?:(?:track|titre|morceau)\s*)?(?:number|numero|n°|#)?\s*(\d+)\b/);
 if(r){const position=Number(r[1]);return position>0?{type:'replace',index:position-1}:{type:'unknown'};}
 const b=d.match(/\b(?:after|apres|a partir de)\s*(\d+)\s*(?:minutes?|min(?:ute)?s?)(?:\b|$)/);
 if(b&&/energy|energie/.test(d))return {type:'boost',minute:Number(b[1])};
 if(/\b(?:chill|calme|doux|douce|relax|tranquille)\b/.test(d)&&/\b(?:beginning|begin|start|debut|depart|intro)\b/.test(d))return {type:'chill'};
 if(/\b(?:ending|end|fin|final|finale)\b/.test(d)&&/power|puissan|energie|energique|intense/.test(d))return {type:'end'};
 if(/\bmore afro|\bplus (?:d[' ]|de |davan\w* )?afro|\bdavantage d[' ]afro/.test(d))return {type:'genre',genre:'Afro House'};
 return {type:'unknown'};
}
