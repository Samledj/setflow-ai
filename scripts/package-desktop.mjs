import { packager } from '@electron/packager';
import { cp,mkdtemp,mkdir,writeFile,readdir,readFile } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
const require=createRequire(import.meta.url);const root=process.cwd();
const standalone=join(root,'.next','standalone');
await mkdir(join(root,'desktop-build'),{recursive:true});const stage=await mkdtemp(join(root,'desktop-build','stage-'));
await cp(standalone,join(stage,'server'),{recursive:true,dereference:true,filter:src=>!/(?:^|\/)(?:data|\.env[^/]*|\.git|desktop-build|release)(?:\/|$)/.test(src.slice(standalone.length))});
await cp(join(root,'public'),join(stage,'server','public'),{recursive:true});await cp(join(root,'.next','static'),join(stage,'server','.next','static'),{recursive:true});await cp(join(root,'desktop','main.cjs'),join(stage,'main.cjs'));
await writeFile(join(stage,'package.json'),JSON.stringify({name:'setflow-ai',productName:'SETFLOW AI',version:'1.0.0',main:'main.cjs',description:'Votre studio DJ personnel',author:'SETFLOW AI',private:true},null,2));
async function verify(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const file=join(folder,entry.name);if(entry.isDirectory()){if(entry.name==='data')throw new Error('Un dossier privé a été inclus dans le paquet.');await verify(file);}else if(/\.sqlite(?:-wal|-shm)?$|^\.env/.test(entry.name))throw new Error('Un fichier privé a été inclus dans le paquet.');}}
await verify(stage);
const tag=new Date().toISOString().replace(/[:.]/g,'-');const out=await mkdtemp(join(tmpdir(),'setflow-signed-'));const delivery=join(root,'release',tag);await mkdir(delivery,{recursive:true});
const apps=await packager({dir:stage,name:'SETFLOW AI',platform:'darwin',arch:process.arch,electronVersion:require('electron/package.json').version,out,icon:join(root,'desktop','icon.icns'),appBundleId:'fr.setflow.ai',appCategoryType:'public.app-category.music',asar:false,overwrite:false,prune:false,quiet:true});
const app=join(apps[0],'SETFLOW AI.app');execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});const zip=join(delivery,`SETFLOW-AI-Mac-${process.arch}.zip`);execFileSync('/usr/bin/ditto',['-c','-k','--sequesterRsrc','--keepParent',app,zip],{stdio:'inherit'});await writeFile(join(root,'desktop-build','latest.json'),JSON.stringify({app,zip,architecture:process.arch,builtAt:new Date().toISOString()},null,2));console.log(JSON.stringify({app,zip,architecture:process.arch},null,2));
