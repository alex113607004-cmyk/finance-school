import React,{useState} from 'react';
export default function IntradayAccess({configured,active,busy=false,onConnect,onDisconnect}){
 const [password,setPassword]=useState('');
 if(!configured)return null;
 return <section className="intraday-access" aria-label="私人分時行情"><h3>私人分時行情</h3>{active?<><p>已提供存取密碼；行情連線結果會顯示於下方。關閉或重新載入頁面後需再次輸入。</p><button type="button" onClick={()=>{setPassword('');onDisconnect();}}>鎖定分時行情</button></>:<form onSubmit={e=>{e.preventDefault();onConnect(password);setPassword('');}}><label htmlFor="intraday-access-password">私人分時存取密碼</label><input id="intraday-access-password" type="password" minLength={32} maxLength={128} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="輸入後端設定的存取密碼"/><button type="submit" disabled={busy}>解鎖分時行情</button><p>輸入你的專用存取密碼，請勿在此填入 Fugle API Key。密碼只暫存在此頁面。</p></form>}</section>;
}
