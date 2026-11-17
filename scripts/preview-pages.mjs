import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist/pages'),prefix='/finance-school/',port=Number(process.env.PORT||4176);
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.writeHead(302,{Location:prefix});res.end();return;}
 if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
 const relative=decodeURIComponent(url.pathname.slice(prefix.length)||'index.html'),file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':file.endsWith('.json')?'application/json; charset=utf-8':file.endsWith('.txt')?'text/plain; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Pages preview: http://127.0.0.1:${port}${prefix}#analysis/US/AAPL`));
