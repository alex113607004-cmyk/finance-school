import {marketDate,quoteStatus} from './security.js';
export const NAV_SOURCE='https://www.sitca.org.tw/MemberK0000/F/03/nav.csv';
export const NAV_DATASET='https://data.gov.tw/dataset/11109';
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function parseCSV(text){
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(value);value='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(Boolean))rows.push(row);row=[];value='';}
  else value+=ch;
 }
 if(quoted)throw Error('基金淨值 CSV 引號未結束');
 if(value||row.length){row.push(value);rows.push(row);}return rows;
}
export function parseFundNAV(text,catalog,{now=new Date(),checkedAt=now.toISOString()}={}){
 const rows=parseCSV(text.replace(/^\uFEFF/,'')),headers=rows.shift()||[],fields=['日期','基金代號','基金名稱','基金淨值','幣別','受益憑證代號'];
 if(fields.some(f=>!headers.includes(f)))throw Error('官方基金淨值欄位不符');
 const stocks={},today=marketDate(now,'TW');
 for(const cells of rows){
  const r=Object.fromEntries(headers.map((h,i)=>[h,String(cells[i]||'').trim()])),code=r['受益憑證代號'].toUpperCase(),s=catalog[code];
  if(!s||s.securityKind!=='etf')continue;
  const raw=r['日期'],date=/^\d{8}$/.test(raw)?raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6):'',value=Number(r['基金淨值'].replaceAll(',',''));
  if(!dateOK(date)||date>today||!Number.isFinite(value)||value<=0||!['TWD','USD','CNY','JPY','HKD','EUR','AUD'].includes(r['幣別']))continue;
  const id='TW:'+code,nav={available:true,region:'TW',code,date,value,currency:r['幣別'],kind:'official-daily',unit:'每受益權單位',fundId:r['基金代號'],fundName:r['基金名稱'],issuer:r['公司名稱'],source:NAV_SOURCE,dataset:NAV_DATASET,checkedAt};
  if(!stocks[id]||date>stocks[id].date)stocks[id]=nav;
  else if(date===stocks[id].date&&(value!==stocks[id].value||nav.currency!==stocks[id].currency))throw Error('同一 ETF 同日淨值出現衝突：'+code);
 }
 if(!Object.keys(stocks).length)throw Error('官方來源沒有可對應的 ETF 淨值');return stocks;
}
export function etfPremium(quote,nav,{region='TW',now=new Date()}={}){
 const price=quote?.price??quote?.close;
 if(!nav?.available||!Number.isFinite(nav.value)||nav.value<=0)return {available:false,reason:'尚無可核實基金淨值。'};
 if(nav.kind&&nav.kind!=='official-daily')return {available:false,reason:'尚無正式每日淨值；盤中預估淨值不當作結算淨值。'};
 if(!dateOK(nav.date)||nav.date>marketDate(now,region))return {available:false,reason:'基金淨值日期無效或在未來。'};
 if(!Number.isFinite(price)||price<=0||quote.date!==nav.date||quote.currency!==nav.currency)return {available:false,reason:'價格與淨值未同日、同幣別，折溢價不混算。'};
 if(!quoteStatus(quote,{region,now}).usable)return {available:false,reason:'行情已過期或暫不可用，停止折溢價判讀。'};
 const value=(price/nav.value-1)*100;return {available:true,value,price,nav:nav.value,date:nav.date,currency:nav.currency,position:value>0?'premium':value<0?'discount':'par',label:value>0?'溢價':value<0?'折價':'貼近淨值'};
}
export function selectNAV(publication,region,code,quoteDate){
 const nav=publication?.stocks?.[region+':'+code],history=publication?.history?.[region+':'+code]||[];
 return [nav,...history].filter(Boolean).find(n=>n.date===quoteDate)||nav||{available:false};
}
