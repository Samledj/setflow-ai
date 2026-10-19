import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
export type Account={id:string;username:string};
type UserRow=Account&{salt:string;password_hash:string};
export class AccountError extends Error{constructor(message:string,public status=400){super(message);}}
const databases=globalThis as typeof globalThis&{setflowAccounts?:Map<string,DatabaseSync>};
export function database(){
 const folder=resolve(process.env.SETFLOW_DATA_DIR||join(process.cwd(),'data'));databases.setflowAccounts??=new Map();const existing=databases.setflowAccounts.get(folder);if(existing)return existing;
 mkdirSync(folder,{recursive:true,mode:0o700});const path=join(folder,'setflow.sqlite');const d=new DatabaseSync(path);chmodSync(path,0o600);
 d.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,tracks TEXT NOT NULL DEFAULT '[]',sets TEXT NOT NULL DEFAULT '[]',updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS rate_limits(bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL,reset_at INTEGER NOT NULL);`);
 databases.setflowAccounts.set(folder,d);return d;
}
export function rateLimit(bucket:string,max:number,windowMs:number){const now=Date.now();const d=database();const row=d.prepare(`INSERT INTO rate_limits(bucket,hits,reset_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN reset_at<=? THEN 1 ELSE hits+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING hits`).get(bucket,now+windowMs,now,now) as {hits:number};if(row.hits>max)throw new AccountError('Trop de tentatives. Réessayez dans quelques minutes.',429);}
export function normalizeEmail(value:unknown):string{if(typeof value!=='string')throw new AccountError('Saisissez une adresse e-mail valide.');const email=value.trim().toLowerCase();if(email.length>254||! /^[^\s@<>]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email)||email.split('@')[0].length>64)throw new AccountError('Saisissez une adresse e-mail valide.');return email;}
function credentials(username:unknown,password:unknown){if(typeof username!=='string')throw new AccountError('Saisissez votre e-mail ou votre ancien identifiant.');const name=username.trim().toLowerCase();if(name.includes('@'))normalizeEmail(name);else if(!/^[a-zA-Z0-9_.-]{3,32}$/.test(name))throw new AccountError('Saisissez votre e-mail ou votre ancien identifiant.');if(typeof password!=='string'||password.length<12||password.length>128)throw new AccountError('Le mot de passe doit contenir entre 12 et 128 caractères.');return {username:name,password};}
export async function register(username:unknown,password:unknown):Promise<Account>{
 const c=credentials(normalizeEmail(username),password);rateLimit('register',20,3600000);const salt=randomBytes(16).toString('hex');const hash=await scrypt(c.password,salt,64) as Buffer;const id=randomUUID();const d=database();
 try{d.exec('BEGIN IMMEDIATE');d.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,c.username,salt,hash.toString('hex'),Date.now());d.prepare('INSERT INTO workspaces(user_id,updated_at) VALUES(?,?)').run(id,Date.now());d.exec('COMMIT');}catch(e){d.exec('ROLLBACK');if((e as Error).message.includes('UNIQUE'))throw new AccountError('Cette adresse e-mail est déjà utilisée.',409);throw e;}
 return {id,username:c.username};
}
export async function login(username:unknown,password:unknown):Promise<Account>{
 const c=credentials(username,password);rateLimit('login-global',150,900000);rateLimit(`login:${c.username}`,15,900000);
 const row=database().prepare('SELECT id,username,salt,password_hash FROM users WHERE username=?').get(c.username) as UserRow|undefined;
 // Do equal password-hashing work even for an unknown username.
 const derived=await scrypt(c.password,row?.salt??'00000000000000000000000000000000',64) as Buffer;const expected=Buffer.from(row?.password_hash??'00'.repeat(64),'hex');
 if(!timingSafeEqual(derived,expected)||!row)throw new AccountError('Identifiant ou mot de passe incorrect.',401);
 return {id:row.id,username:row.username};
}
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export function createSession(account:Account,remember:boolean){const token=randomBytes(32).toString('hex');const maxAge=remember?30*86400:12*3600;const d=database();d.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),account.id,Date.now()+maxAge*1000);return {token,maxAge};}
export function sessionAccount(token:string|undefined):Account|null{if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const row=database().prepare('SELECT users.id,users.username FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?').get(digest(token),Date.now()) as Account|undefined;return row?{id:row.id,username:row.username}:null;}
export function revokeSession(token:string|undefined){if(token)database().prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));}
export function readWorkspace(account:Account){const row=database().prepare('SELECT tracks,sets,updated_at FROM workspaces WHERE user_id=?').get(account.id) as {tracks:string;sets:string;updated_at:number}|undefined;if(!row)throw new AccountError('Compte introuvable.',401);return {tracks:JSON.parse(row.tracks),sets:JSON.parse(row.sets),updatedAt:row.updated_at};}
export function writeWorkspace(account:Account,value:{tracks?:unknown[];sets?:unknown[]}){const d=database();if(value.tracks!==undefined)d.prepare('UPDATE workspaces SET tracks=?,updated_at=? WHERE user_id=?').run(JSON.stringify(value.tracks),Date.now(),account.id);if(value.sets!==undefined)d.prepare('UPDATE workspaces SET sets=?,updated_at=? WHERE user_id=?').run(JSON.stringify(value.sets),Date.now(),account.id);}

export async function linkEmail(account:Account,email:unknown,password:unknown):Promise<Account>{const normalized=normalizeEmail(email);await login(account.username,password);try{database().prepare('UPDATE users SET username=? WHERE id=?').run(normalized,account.id);}catch(e){if((e as Error).message.includes('UNIQUE'))throw new AccountError('Cette adresse e-mail est déjà utilisée.',409);throw e;}return {id:account.id,username:normalized};}
