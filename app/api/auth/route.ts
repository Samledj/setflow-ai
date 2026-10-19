import { NextRequest } from 'next/server';
import { AccountError,createSession,login,register,revokeSession,sessionAccount } from '@/lib/server/accounts';
import { body,cookieName,failure,json,sameOrigin,secureCookie } from '@/lib/server/http';
export const runtime='nodejs';
export async function GET(req:NextRequest){try{return json({user:sessionAccount(req.cookies.get(cookieName)?.value)});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{sameOrigin(req);const data=await body(req,4096);if(!data||!['register','login'].includes(data.action))throw new AccountError('Action invalide.');const account=await (data.action==='register'?register(data.username,data.password):login(data.username,data.password));revokeSession(req.cookies.get(cookieName)?.value);const session=createSession(account,data.remember===true);const response=json({user:account});response.cookies.set(cookieName,session.token,{httpOnly:true,secure:secureCookie(req),sameSite:'lax',path:'/',maxAge:session.maxAge});return response;}catch(e){return failure(e);}}
export async function DELETE(req:NextRequest){try{sameOrigin(req);revokeSession(req.cookies.get(cookieName)?.value);const response=json({ok:true});response.cookies.set(cookieName,'',{httpOnly:true,secure:secureCookie(req),sameSite:'lax',path:'/',maxAge:0});return response;}catch(e){return failure(e);}}
