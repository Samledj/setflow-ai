// Explicit local migration. The private database is never put into the app package.
import { DatabaseSync,backup } from 'node:sqlite';
import { existsSync,mkdirSync,chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const source=join(process.cwd(),'data','setflow.sqlite');const folder=join(homedir(),'Library','Application Support','SETFLOW AI','data');const destination=join(folder,'setflow.sqlite');
if(!existsSync(source)){console.log('Aucune base locale à transférer.');process.exit(0);}if(existsSync(destination)){console.log('Une base existe déjà dans l’application : aucun remplacement effectué.');process.exit(0);}
mkdirSync(folder,{recursive:true,mode:0o700});const d=new DatabaseSync(source,{readOnly:true});await backup(d,destination);d.close();chmodSync(destination,0o600);console.log('Copie privée des comptes et bibliothèques créée dans le dossier de l’application. La base originale est conservée.');
