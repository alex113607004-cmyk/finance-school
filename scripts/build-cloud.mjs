import fs from 'node:fs';
// Embed only HTML; do not use Static Assets, whose router omits ctx.access.
const html=fs.readFileSync('dist/pages/index.html','utf8').replace('<head>','<head><meta name="finance-school-mode" content="cloud">');
fs.mkdirSync('worker/generated',{recursive:true});fs.writeFileSync('worker/generated/cloud-html.mjs','export const CLOUD_HTML='+JSON.stringify(html)+';\n');
console.log('Private cloud HTML prepared; Access context required before serving it.');
