const {app,BrowserWindow,Menu,dialog,shell,utilityProcess,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const net=require('node:net');
app.setName('SETFLOW AI');
const selfTest=process.argv.includes('--self-test');
const testRoot=selfTest?fs.mkdtempSync(path.join(os.tmpdir(),'setflow-mac-smoke-')):null;
if(testRoot)app.setPath('userData',testRoot);
const PORT=39102;
const origin=`http://127.0.0.1:${PORT}`;
let backend,window,quitting=false,restarting=false;
const serverDir=app.isPackaged?path.join(__dirname,'server'):path.join(__dirname,'..','.next','standalone');
const dataDir=path.join(app.getPath('userData'),'data');
function freePort(){return new Promise((resolve,reject)=>{const socket=net.createServer();socket.once('error',()=>reject(new Error(`Le port ${PORT} est utilisé. Fermez l’autre instance SETFLOW, puis réessayez.`)));socket.listen(PORT,'127.0.0.1',()=>socket.close(resolve));});}
async function startBackend(){
 if(!fs.existsSync(path.join(serverDir,'server.js')))throw new Error('Le serveur embarqué est introuvable. Reconstruisez l’application avec npm run desktop:package.');
 await freePort();fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 const log=fs.createWriteStream(path.join(app.getPath('userData'),'server.log'),{flags:'w',mode:0o600});
 backend=utilityProcess.fork(path.join(serverDir,'server.js'),[],{cwd:serverDir,env:{...process.env,NODE_ENV:'production',PORT:String(PORT),HOSTNAME:'127.0.0.1',SETFLOW_DATA_DIR:dataDir,NEXT_TELEMETRY_DISABLED:'1'},stdio:'pipe',serviceName:'SETFLOW Local Server'});
 backend.stdout?.on('data',chunk=>log.write(chunk));backend.stderr?.on('data',chunk=>log.write(chunk));let failure;
 backend.once('exit',code=>{log.end();failure=new Error(`Le serveur SETFLOW s’est arrêté (${code}).`);if(!quitting&&!restarting&&!selfTest){dialog.showErrorBox('SETFLOW — serveur arrêté','Fermez puis relancez l’application. Vos données sont conservées.');app.quit();}});
 for(let i=0;i<200;i++){if(failure)throw failure;try{const response=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1000)});const data=await response.json();if(data.app==='SETFLOW AI'&&data.status==='ready')return;}catch{}await new Promise(r=>setTimeout(r,150));}
 throw new Error('Le serveur ne répond pas. Le journal est disponible dans le dossier de données de SETFLOW.');
}
function createWindow(){window=new BrowserWindow({title:'SETFLOW AI',width:1380,height:940,minWidth:720,minHeight:620,backgroundColor:'#09090a',show:false,autoHideMenuBar:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}});window.webContents.setUserAgent(window.webContents.getUserAgent()+' SETFLOWDesktop/1.0.0');
 window.webContents.setWindowOpenHandler(({url})=>{try{if(new URL(url).protocol==='https:')void shell.openExternal(url);}catch{}return {action:'deny'};});window.webContents.on('will-navigate',(event,url)=>{try{if(new URL(url).origin!==origin)event.preventDefault();}catch{event.preventDefault();}});
 window.once('ready-to-show',()=>window.show());window.on('closed',()=>{window=null;});void window.loadURL(origin);
}
async function importDatabase(){
 const {DatabaseSync,backup}=require('node:sqlite');const target=path.join(dataDir,'setflow.sqlite');
 if(fs.existsSync(target)){const current=new DatabaseSync(target,{readOnly:true});let count;try{count=current.prepare('SELECT COUNT(*) AS count FROM users').get().count;}finally{current.close();}if(count>0){dialog.showMessageBoxSync({type:'info',message:'Des comptes existent déjà dans cette application.',detail:'Aucun remplacement automatique n’est effectué pour préserver vos bibliothèques. Connectez-vous au compte existant ou importez un XML.'});return;}}
 const result=await dialog.showOpenDialog({title:'Importer les comptes et bibliothèques SETFLOW',properties:['openFile'],filters:[{name:'Base SQLite SETFLOW',extensions:['sqlite']}]});if(result.canceled)return;
 const staged=path.join(dataDir,`import-${Date.now()}.sqlite`);let source;
 try{source=new DatabaseSync(result.filePaths[0],{readOnly:true});const tables=source.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t=>t.name);if(!['users','sessions','workspaces'].every(t=>tables.includes(t)))throw new Error('Ce fichier n’est pas une base SETFLOW.');await backup(source,staged);source.close();source=null;
 restarting=true;const stopped=new Promise(resolve=>backend.once('exit',resolve));backend.kill();await stopped;
 const history=path.join(dataDir,'history',String(Date.now()));fs.mkdirSync(history,{recursive:true,mode:0o700});for(const suffix of ['','-wal','-shm'])if(fs.existsSync(target+suffix))fs.renameSync(target+suffix,path.join(history,'setflow.sqlite'+suffix));fs.renameSync(staged,target);fs.chmodSync(target,0o600);await startBackend();restarting=false;dialog.showMessageBoxSync({type:'info',message:'Vos comptes et bibliothèques ont été importés.',detail:'Reconnectez-vous avec votre compte habituel. La base source est conservée.'});window?.reload();
 }catch(e){source?.close();restarting=false;dialog.showErrorBox('Import impossible',e.message);}
}
function setupMenu(){Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'SETFLOW AI',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},{label:'Édition',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'Affichage',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},{label:'Données',submenu:[{label:'Ouvrir le dossier privé SETFLOW',click:()=>void shell.openPath(dataDir)},{label:'Importer une base SETFLOW existante…',click:()=>void importDatabase()},{type:'separator'},{label:'À propos du stockage',click:()=>dialog.showMessageBoxSync({type:'info',message:'Vos données restent sur ce Mac.',detail:'Les comptes sont dans le dossier privé de l’application. Ils ne sont pas inclus dans le fichier .app ni dans son ZIP. Le téléphone utilise les comptes du serveur web auquel il se connecte.'})}]}]));}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.on('before-quit',()=>{quitting=true;backend?.kill();});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
 app.whenReady().then(async()=>{try{session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));await startBackend();if(selfTest){const auth=await fetch(origin+'/api/auth');if(auth.status!==200)throw new Error('Le service de comptes ne répond pas.');const user=await auth.json();if(user.user!==null)throw new Error('La base de test doit être vide.');const manifest=await fetch(origin+'/manifest.webmanifest');if(manifest.status!==200)throw new Error('Manifeste mobile absent.');console.log('SETFLOW_DESKTOP_SELF_TEST_OK');quitting=true;backend?.kill();setTimeout(()=>app.exit(0),200);return;}setupMenu();createWindow();app.on('activate',()=>{if(!window)createWindow();});}catch(e){console.error(e);quitting=true;backend?.kill();if(!selfTest)dialog.showErrorBox('SETFLOW ne peut pas démarrer',e.message);app.exit(1);}});
}
