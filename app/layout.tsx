import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SETFLOW AI — Your AI DJ Set Generator', description: 'Describe your night. Get your set. Local DJ set generator for your Rekordbox library.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="fr"><body>{children}</body></html>; }
