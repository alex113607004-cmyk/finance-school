// Google Finance is a destination for user lookup, not a scraped data provider.
export function googleFinanceUrl(symbol){
 const m=String(symbol||'').match(/^(TWSE|NASDAQ|NYSE|AMEX):([A-Z0-9.]{1,12})$/);if(!m)return null;
 const market=m[1],ticker=m[2],exchange=market==='TWSE'?'TPE':market==='AMEX'?(ticker==='VOO'?'NYSEARCA':'NYSEAMERICAN'):market;
 return `https://www.google.com/finance/quote/${encodeURIComponent(ticker)}:${exchange}?hl=zh-TW`;
}
