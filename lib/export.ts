import { DJSet } from './types';
import { energy } from './engine';
export function serialize(set:DJSet,format:'csv'|'txt'|'json'):string{
 if(format==='json')return JSON.stringify(set,null,2);
 if(format==='txt')return `${set.name}\n${set.settings.event} · ${set.settings.minutes} min demandées\n\n`+set.tracks.map((t,i)=>`${i+1}. ${t.artist||'Artiste non renseigné'} — ${t.title||'Titre non renseigné'} | ${t.bpm??'?'} BPM | ${t.camelot??'?'} | ${t.duration??'?'} s | Énergie ${energy(t)}${t.energy===null?' (estimée)':''}`).join('\n');
 const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const rows=[['Position','Title','Artist','BPM','Original key','Camelot','Energy','Energy source','Duration (s)','Genre','File location'],...set.tracks.map((t,i)=>[i+1,t.title,t.artist,t.bpm,t.key,t.camelot,energy(t),t.energy===null?'Estimated from BPM':'Manual',t.duration,t.genre,t.location])];return '\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
export function download(set:DJSet,format:'csv'|'txt'|'json'){const url=URL.createObjectURL(new Blob([serialize(set,format)],{type:format==='json'?'application/json':format==='csv'?'text/csv;charset=utf-8':'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${set.name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80)||'setflow'}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
