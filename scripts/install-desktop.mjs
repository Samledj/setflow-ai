import { readFile,mkdir,access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const latest=JSON.parse(await readFile('desktop-build/latest.json','utf8'));const folder=join(homedir(),'Applications');const target=join(folder,'SETFLOW AI.app');
try{await access(target);throw new Error('SETFLOW AI.app existe déjà dans Applications. Aucun remplacement automatique effectué.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(folder,{recursive:true});execFileSync('/usr/bin/ditto',['-x','-k',latest.zip,folder],{stdio:'inherit'});execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',target],{stdio:'inherit'});console.log('Application installée et signature locale vérifiée : '+target);
