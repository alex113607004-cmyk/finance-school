import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
function marketSnapshot(){return {
 name:'published-market-snapshot',
 configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.split('?')[0]!=='/market-data.json')return next();res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync('src/generated/market.json'));});},
 generateBundle(){this.emitFile({type:'asset',fileName:'market-data.json',source:fs.readFileSync('src/generated/market.json','utf8')});},
};}
export default defineConfig({base:'./',plugins:[marketSnapshot(),react(),tailwindcss(),viteSingleFile()],build:{outDir:'dist/pages',emptyOutDir:true,assetsInlineLimit:10000000},test:{environment:'jsdom',globals:true,setupFiles:['./src/test-setup.js'],include:['src/**/*.test.{js,jsx}'],pool:'forks',maxWorkers:1}});
