import {analyzeFundamentals} from './fundamentals.js';

const finite=Number.isFinite;
export function analyzePrice(data,now=new Date(),fundamental=analyzeFundamentals(data,now)){
 const v=data?.valuation,peer=data?.fundamentals?.peer,price=data?.quote?.close;
 const base={status:'insufficient',available:false,title:'資料不足，暫不能確認現價合理性',summary:'先確認同日價格、正式估值與可比較同業資料。',gaps:[],scenarios:[],premium:null,peerCount:peer?.count||0,price:price??null,date:data?.quote?.date||null};
 if(!data?.fundamentals)return base;
 if(data.fundamentals.kind!=='company')return {...base,status:'special',title:'此標的需使用專屬估值方法',summary:fundamental.summary};
 const comparable=finite(price)&&price>0&&finite(v?.pe)&&v.pe>0&&data.quote.date===v.date&&peer?.date===v.date&&peer?.financialPeriod===v.financialPeriod&&!!v.financialPeriod&&peer.industryCode===data.fundamentals.industryCode&&peer.count>=5&&[peer.p25,peer.median,peer.p75].every(n=>finite(n)&&n>0)&&peer.p25<=peer.median&&peer.median<=peer.p75;
 const gaps=[...fundamental.criticalGaps];
 if(!comparable)gaps.push('缺少至少五家同產業、同估值日、同參考財報期且本益比為正的完整同業分布。');
 if(gaps.length)return {...base,gaps:[...new Set(gaps)],summary:'仍可閱讀已公布數字，但價格或基本面來源有缺口，先核對資料再評估現價。'};
 if(fundamental.status==='caution')return {...base,status:'caution',title:'先釐清獲利或權益警訊，再談價格合理性',summary:fundamental.summary,gaps:fundamental.concerns};
 const premium=(v.pe/peer.median-1)*100;
 const scenarios=[
  {key:'p25',label:'同業第 25 百分位情境',pe:peer.p25,price:price*peer.p25/v.pe},
  {key:'median',label:'同業中位數情境',pe:peer.median,price:price*peer.median/v.pe},
  {key:'p75',label:'同業第 75 百分位情境',pe:peer.p75,price:price*peer.p75/v.pe},
 ];
 const status=v.pe>peer.p75?'high':v.pe<peer.p25?'low':'middle';
 const title=status==='high'?'相對估值偏高，現價需要更強的成長支持':status==='low'?'相對倍數偏低，先確認折價原因':'相對估值位於同業常見區間，合理性仍有條件';
 const summary=status==='high'?'本益比高於同業第 75 百分位，已反映較高獲利期待。尚未取得未來獲利預測與現金流，現有資料不足以驗證這個溢價。':status==='low'?'本益比低於同業第 25 百分位。折價可能涉及產業位置、一次性收益、成長或財務風險，不能直接視為便宜。':'本益比落在同業第 25 至 75 百分位，屬分布中段。這支持相對位置的判讀，仍不能證明公司的內在合理價或投資報酬。';
 return {...base,status,available:true,title,summary,premium,scenarios,gaps:fundamental.gaps,concerns:fundamental.concerns};
}
