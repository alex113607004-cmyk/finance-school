import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
import {createLocalServer} from './local-server.mjs';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(project);
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||major===22&&minor<12){console.error('請先安裝 Node.js 24 LTS：https://nodejs.org/');process.exit(1);}
const index=path.join(project,'dist/pages/index.html');
function newer(dir,time){if(!fs.existsSync(dir))return false;return fs.readdirSync(dir,{withFileTypes:true}).some(e=>e.isDirectory()?newer(path.join(dir,e.name),time):fs.statSync(path.join(dir,e.name)).mtimeMs>time);}
function npm(args){const r=process.platform==='win32'?spawnSync('cmd.exe',['/d','/s','/c','npm '+args.join(' ')],{stdio:'inherit'}):spawnSync('npm',args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
if(!fs.existsSync(index)||newer(path.join(project,'src'),fs.statSync(index).mtimeMs)){
 if(!fs.existsSync('node_modules/vite'))npm(['ci']);npm(['run','build:pages']);
}
const port=Number(process.env.FINANCE_SCHOOL_LOCAL_PORT||4178);
if(!Number.isInteger(port)||port<1024||port>65535){console.error('本機連接埠設定不正確。');process.exit(1);}
const server=createLocalServer();
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'這個連接埠已在使用，請檢查是否已開啟本機版。':'本機服務無法啟動。');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 const url='http://127.0.0.1:'+port+'/#watchlist/all';console.log('\n台美股本機版已啟動：'+url+'\n無需登入。請保留此視窗，關閉即停止服務。\n第一次使用，在網站填入 Fugle API Key。金鑰只存於本機 .local/fugle-local.json。');
 if(process.env.FINANCE_SCHOOL_NO_OPEN!=='1'){
  const child=process.platform==='win32'?spawn('cmd.exe',['/d','/s','/c','start "" "'+url+'"'],{stdio:'ignore'}):spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'});child.on('error',()=>console.log('請在瀏覽器開啟上方網址。'));child.unref();
 }
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
