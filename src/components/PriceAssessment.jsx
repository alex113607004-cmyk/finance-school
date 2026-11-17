import React from 'react';
import {analyzePrice} from '../valuation.js';
import {format} from '../domain.js';

export default function PriceAssessment({data,fundamental,term,now=new Date(),updating=false}){
 const result=analyzePrice(data,now,fundamental),f=data?.fundamentals,v=data?.valuation;
 const direction=result.premium>0?'高於':result.premium<0?'低於':'等於';
 return <section className="panel price-assessment" aria-label="目前股價合理性分析">
  <span className="eyebrow">PRICE & VALUE / 將價格放回獲利與同業</span>
  <h2>目前股價合理嗎？</h2>
  <div className={'valuation-conclusion valuation-'+(updating?'insufficient':result.status)}><h3>{updating?'正在核對來源，現價判讀待確認':result.title}</h3><p>{updating?'更新完成後，再以同日收盤與正式估值重算。':result.summary}</p></div>
  <p className="subtle">{data?.name||'目前標的'} {data?.code||''} · 收盤 {format(result.price)} 元／股 · 價格日 {result.date||'—'} · 估值日 {v?.date||'—'} · 參考財報期 {v?.financialPeriod||'未提供'}</p>
  {!updating&&result.available&&<>
   <div className="valuation-position"><div>{term('本益比')}<strong>{format(v.pe)} <small>倍</small></strong></div><div>{term('同業本益比中位數')}<strong>{format(f.peer.median)} <small>倍</small></strong></div><div><span>相對同業中位數</span><strong>{result.premium===0?'相同':<>{direction} {format(Math.abs(result.premium))}<small>%</small></>}</strong></div></div>
   <p>以 {result.peerCount} 家其他上市公司的正本益比比較，目前倍數{result.premium===0?'與同業中位數相同':direction+'同業中位數 '+format(Math.abs(result.premium))+'%'}。同業均為相同產業代碼、估值日及參考財報期；未做個別成長或風險調整。</p>
   <h3 className="valuation-subheading">不同同業倍數下，價格會是多少？</h3>
   <p className="subtle">固定官方本益比使用的獲利分母，只替換估值倍數。以下是條件情境，不是合理價上下限、目標價或預測。</p>
   <div className="valuation-scenarios">{result.scenarios.map(scenario=><article key={scenario.key}><span>{scenario.label}</span><strong>{format(scenario.price)}<small> 元／股</small></strong><p>{format(scenario.pe)} 倍本益比</p></article>)}</div>
   <details><summary>展開情境價格公式與原始數字</summary><p className="formula">情境價格＝同日收盤價 × 參考同業本益比 ÷ 官方本益比。<br/>{result.scenarios.map(scenario=><React.Fragment key={scenario.key}>{scenario.label}：{format(result.price)} × {format(scenario.pe,4)} ÷ {format(v.pe)}＝{format(scenario.price)} 元／股。<br/></React.Fragment>)}相對溢價／折價＝(官方本益比 ÷ 同業中位數 − 1) ×100%。未以累計 EPS 當近四季 EPS，也未另外驗證或預測獲利分母。來源本益比有四捨五入，情境價格僅為近似值。</p></details>
   <div className="valuation-business-context"><h3>基本面能否支持這個價格？</h3><ul>
    <li>已公布累計 EPS {format(f.earnings?.epsYtd)} 元／股（{f.earnings?.period?.label||'期間未提供'}）；營業利益率 {format(data.profit?.operating)}%、淨利率 {format(data.profit?.net)}%。這是已發生的累計表現，不能代替未來 EPS。</li>
    <li>{f.revenue?.month||'—'} 月營收年增 {format(f.revenue?.yoy)}%、年初累計營收年增 {format(f.revenue?.ytdGrowth)}%；成長能否轉為持續淨利與現金流仍待確認。</li>
    <li>負債比率 {format(f.balance?.debtRatio)}%、流動比率 {format(f.balance?.currentRatio)}%；需配合負債到期與資產品質，不能只靠比例確認安全。</li>
    {result.concerns.map(reason=><li key={reason}>{reason}</li>)}
    <li>尚未接入現金流、多年 EPS 趨勢及前瞻獲利，無法獨立驗證內在價值；均線顯示的趨勢也不等於價格合理。</li>
   </ul></div>
  </>}
  {!updating&&!result.available&&result.gaps.length>0&&<ul className="valuation-gaps">{result.gaps.map(gap=><li key={gap}>{gap}</li>)}</ul>}
  <div className="source-links">{[['valuation','正式本益比與估值'],['companies','同業產業分類'],['earnings','累計 EPS'],['revenue','月營收'],['balance','資產負債']].map(([key,label])=>data?.sources?.[key]?<a key={key} href={data.sources[key]} target="_blank" rel="noopener noreferrer">證交所｜{label} ↗</a>:null)}</div>
 </section>;
}
