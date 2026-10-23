import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SETFLOW AI — Your AI DJ Set Generator', description: 'Describe your night. Get your set. Local DJ set generator for your Rekordbox library.', applicationName:'SETFLOW AI', appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'SETFLOW'}, icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'} };
export const viewport:Viewport={themeColor:'#09090a',width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="fr"><body>{children}</body></html>; }
