// Only a backend / Actions runner may read provider credentials or local research data.
export function publicQuoteBundle(input,{publicDisplayConfirmed=false}={}){
 const gap=reason=>({quote:{status:'unavailable',price:null,currency:'USD',reason},history:{rows:[],sources:[],completeMonths:[],corporateActionsVerified:false,reason}});
 if(!input)return gap('未設定具公開展示權的行情來源。');
 if(!publicDisplayConfirmed||input.provider==='yfinance'||input.license?.publicDisplayAllowed!==true||!input.license?.documentation||!input.license?.checkedAt)return gap('此來源未核實公開展示及快取權利；僅可留在本機研究。');
 const q=input.quote;if(!q||!['realtime','delayed','aftermarket'].includes(q.status)||!Number.isFinite(q.price)||q.price<=0||!q.timestamp||!q.date||q.currency!=='USD')return gap('行情格式、日期、幣別或狀態不足，未發布。');
 if(input.region!=='US'||!input.symbol||!input.exchange)return gap('行情市場、代號與交易所識別不足，未發布。');
 const cleanSession=s=>s&&Number.isFinite(s.price)&&s.timestamp?{price:s.price,timestamp:s.timestamp,volume:s.volume??null,status:s.status||q.status}:null;
 const quote={price:q.price,close:q.price,status:q.status,currency:'USD',timestamp:q.timestamp,date:q.date,change:Number.isFinite(q.change)?q.change:null,changePercent:Number.isFinite(q.changePercent)?q.changePercent:null,volume:Number.isFinite(q.volume)?q.volume:null,delayMinutes:q.delayMinutes??null,source:input.provider,sourceURL:input.license.documentation,exchangeCoverage:input.exchangeCoverage||'尚未列明',sessions:{pre:cleanSession(q.sessions?.pre),regular:cleanSession(q.sessions?.regular),post:cleanSession(q.sessions?.post)}};
 const h=input.history||{};
 return {quote,history:{code:input.symbol,region:'US',market:input.exchange,rows:(h.rows||[]).map(({date,open,high,low,close,volume})=>({date,open,high,low,close,volume})),sources:h.sources||[],adjustment:h.adjustment||'unconfirmed',completeMonths:h.completeMonths||[],coverageStart:h.coverageStart||null,corporateActionsVerified:h.corporateActionsVerified===true,corporateActions:h.corporateActions||[],epsShareBases:h.epsShareBases||[],partial:!!h.partial},license:{publicDisplayAllowed:true,documentation:input.license.documentation,checkedAt:input.license.checkedAt,cachePolicy:input.license.cachePolicy||'依合約，不假定可永久快取'}};
}
