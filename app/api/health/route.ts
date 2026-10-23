import { NextResponse } from 'next/server';
export const dynamic='force-dynamic';
export function GET(){return NextResponse.json({app:'SETFLOW AI',status:'ready'},{headers:{'Cache-Control':'no-store'}});}
