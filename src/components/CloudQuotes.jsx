import React,{useEffect,useState} from 'react';
export default function CloudQuotes({onReady,expired=false}){
 const [message,setMessage]=useState('正在確認 Email 登入狀態…'),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;onReady(false);fetch('/api/session',{credentials:'same-origin',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok||r.type==='opaqueredirect')throw Error();const data=await r.json();if(data.mode!=='cloud-access'||!data.authenticated)throw Error();if(active){onReady(data.configured);setMessage(data.configured?'Email 登入已確認，行情結果顯示於下方。':'Email 登入已確認；請在 Cloudflare 設定 Fugle Key 與個人使用開關。');}}).catch(()=>{if(active){onReady(false);setMessage('登入已失效或尚未完成驗證，請重新驗證。');}});return()=>{active=false;};},[revision,onReady]);
 return <section className="intraday-access cloud-quotes" aria-label="雲端 Email 驗證"><h3>私人雲端看盤</h3><p>以 Email 驗證碼登入，手機、平板與電腦都能使用。Fugle Key 留在後端。</p><p role="status">{expired?'Email 驗證已失效，請重新驗證。':message}</p><div className="cloud-session-links"><a href="/">重新驗證登入</a><button type="button" onClick={()=>setRevision(n=>n+1)}>重新檢查狀態</button><a href="/cdn-cgi/access/logout">登出</a></div></section>;
}
