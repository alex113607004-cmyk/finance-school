// Offline migration of already verified snapshots. Never renew source timestamps.
import fs from 'node:fs';
import {industryInfo,secIndustry} from '../src/industries.js';
import {withOverviewIndustries} from '../src/market-overview.js';
const read=name=>JSON.parse(fs.readFileSync(name,'utf8'));
const write=(name,data)=>fs.writeFileSync(name,JSON.stringify(data)+'\n');
const full=read('src/generated/universe.json'),catalog=read('src/generated/universe-catalog.json');
for(const [code,stock] of Object.entries(catalog.stocks)){
 const verified=full.stocks[code];
 if(verified?.market===stock.market)stock.industry=industryInfo(verified,'TW');
}
write('src/generated/universe-catalog.json',catalog);
write('src/generated/market-overview.json',withOverviewIndustries(read('src/generated/market-overview.json'),catalog.stocks));
for(const name of ['us','us-summary']){
 const data=read(`src/generated/${name}.json`);
 for(const stock of Object.values(data.stocks)){
  if(stock.region!=='US'||stock.securityKind!=='stock')continue;
  const file=`data/sec/${stock.code}-submissions.json`;
  if(!fs.existsSync(file))continue;
  const sub=read(file);
  if(Number(sub.cik)!==Number(stock.cik)||!sub.tickers?.includes(stock.code))continue;
  stock.industry=secIndustry(sub,{source:stock.sources.submissions,checkedAt:stock.sourceChecks?.submissions?.checkedAt});
 }
 write(`src/generated/${name}.json`,data);
}
console.log('Official classification metadata copied; original quote and check dates preserved.');
