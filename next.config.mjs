/** @type {import('next').NextConfig} */
const nextConfig={
 output:'standalone',
 outputFileTracingExcludes:{'/*':['./data/**/*','./desktop-build/**/*','./release/**/*','./.env*','./tests/**/*']},
 async headers(){return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'},{key:'Content-Type',value:'application/javascript; charset=utf-8'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'"}]}];}
};
export default nextConfig;
