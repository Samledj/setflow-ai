import { Track } from './types';
import { camelot } from './engine';
export function parseRekordbox(xml:string,Parser:typeof DOMParser=DOMParser):{tracks:Track[];warnings:string[]} {
 const doc=new Parser().parseFromString(xml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length||!doc.getElementsByTagName('DJ_PLAYLISTS').length)throw new Error('XML Rekordbox invalide : élément DJ_PLAYLISTS introuvable ou syntaxe incorrecte.');
 const collection=doc.getElementsByTagName('COLLECTION')[0];if(!collection)throw new Error('Le fichier ne contient aucune COLLECTION Rekordbox.');
 const lists=new Map<string,string[]>(); const nodes=Array.from(doc.getElementsByTagName('NODE'));
 for(const node of nodes){if(node.getAttribute('Type')!=='1'||node.getAttribute('KeyType')==='1')continue; const name=node.getAttribute('Name')||'Playlist';for(const t of Array.from(node.getElementsByTagName('TRACK'))){const id=t.getAttribute('Key');if(id)lists.set(id,[...new Set([...(lists.get(id)??[]),name])]);}}
 const seen=new Set<string>(); const warnings:string[]=[];let duplicates=0;
 const tracks=Array.from(collection.getElementsByTagName('TRACK')).flatMap((el,index)=>{
  const id=el.getAttribute('TrackID')||`xml-${index}`;if(seen.has(id)){duplicates++;return [];}seen.add(id);
  const read=(name:string)=>el.getAttribute(name)||'';const num=(name:string)=>{const v=read(name);const n=Number(v);return v&&Number.isFinite(n)&&n>0?n:null;};
  const rawRating=num('Rating'); const key=read('Tonality');
  return [{id,title:read('Name'),artist:read('Artist'),bpm:num('AverageBpm'),key,camelot:camelot(key),genre:read('Genre'),duration:num('TotalTime'),rating:rawRating===null?null:Math.min(5,Math.round(rawRating/51)),playlists:lists.get(id)??[],location:read('Location'),energy:null,demo:false} satisfies Track];
 });
 if(!tracks.length)throw new Error('La collection XML ne contient aucun morceau.');
 if(duplicates)warnings.push(`${duplicates} identifiants en double ignorés.`);
 const missing=tracks.filter(t=>!t.duration).length;if(missing)warnings.push(`${missing} titres sans durée : exclus de la génération jusqu’à correction locale.`);
 return {tracks,warnings};
}
