// Produces a clean, provider-independent source tree for a NEW GitHub repository.
import fs from 'node:fs';import path from 'node:path';
const dest=process.argv[2];if(!dest||!path.isAbsolute(dest))throw new Error('Supply a new absolute export directory.');if(fs.existsSync(dest))throw new Error('Export directory already exists; choose a new one.');fs.mkdirSync(dest,{recursive:true});
for(const f of ['src','worker','tests','docs','.github','index.html','vite.config.js','package.json','package-lock.json','.gitignore','.env.example','README.md'])fs.cpSync(f,path.join(dest,f),{recursive:true});
fs.mkdirSync(path.join(dest,'scripts'));for(const f of ['build-worker.mjs','export-github.mjs','update-market.mjs'])fs.copyFileSync(path.join('scripts',f),path.join(dest,'scripts',f));
console.log('Clean GitHub source exported to '+dest);
