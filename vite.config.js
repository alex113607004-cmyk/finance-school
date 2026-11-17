import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
function marketSnapshot(){return {
 name:'published-market-snapshot',
 configureServer(server){server.middlewares.use((req,res,next)=>{
  const path=req.url?.split('?')[0],name={'/market-data.json':'market','/analysis-data.json':'analysis','/universe-data.json':'universe','/us-data.json':'us','/us-stocks-data.json':'us-stocks'}[path];
  const match=path?.match(/^\/stock-history\/(TPEX)\/([0-9A-Z]{4,6})\.json$/);
  const file=name?'src/generated/'+name+'.json':match?`src/generated/histories/${match[1]}/${match[2]}.json`:null;
  if(!file)return next();if(!fs.existsSync(file)){res.statusCode=404;res.end('Snapshot unavailable');return;}
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
 });},
 generateBundle(){
  for(const file of ['THIRD-PARTY-NOTICES.txt','LICENSE-lightweight-charts.txt'])this.emitFile({type:'asset',fileName:file,source:fs.readFileSync('docs/'+file,'utf8')});
  for(const name of ['market','analysis','universe','us','us-stocks'])this.emitFile({type:'asset',fileName:name+'-data.json',source:fs.readFileSync('src/generated/'+name+'.json','utf8')});
  const dir='src/generated/histories/TPEX';if(fs.existsSync(dir))for(const file of fs.readdirSync(dir).filter(f=>/^[0-9A-Z]{4,6}\.json$/.test(f)))this.emitFile({type:'asset',fileName:'stock-history/TPEX/'+file,source:fs.readFileSync(dir+'/'+file,'utf8')});
 },
};}
export default defineConfig({base:'./',server:{proxy:{'/api/twstock/quote':'http://127.0.0.1:4174'}},plugins:[marketSnapshot(),react(),tailwindcss(),viteSingleFile()],build:{outDir:'dist/pages',emptyOutDir:true,assetsInlineLimit:10000000},test:{testTimeout:10000,environment:'jsdom',globals:true,setupFiles:['./src/test-setup.js'],include:['src/**/*.test.{js,jsx}'],pool:'forks',maxWorkers:1}});
