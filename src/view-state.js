import {validIndustryKey} from './industries';
export const OVERVIEW_VIEW_KEY='finance-school.overview-view.v1';
export const DEFAULT_OVERVIEW_VIEW={industry:'all',market:'all',type:'stock',category:'hot',metric:'volume',page:1,scrollY:0,tableLeft:0};
export function overviewView(value={}){
 const v=value&&typeof value==='object'?value:{};
 const pick=(key,valid)=>valid.includes(v[key])?v[key]:DEFAULT_OVERVIEW_VIEW[key];
 return {industry:validIndustryKey(v.industry)?v.industry:'all',market:pick('market',['all','TWSE','TPEX']),type:pick('type',['stock','etf','all']),category:pick('category',['hot','gainers','losers','limitUp','limitDown']),metric:pick('metric',['volume','turnover']),page:Number.isInteger(v.page)&&v.page>=1&&v.page<=5000?v.page:1,scrollY:Number.isFinite(v.scrollY)&&v.scrollY>=0?Math.min(v.scrollY,1e7):0,tableLeft:Number.isFinite(v.tableLeft)&&v.tableLeft>=0?Math.min(v.tableLeft,1e6):0};
}
export function createViewStateStore({getStorage=()=>window.sessionStorage,key=OVERVIEW_VIEW_KEY,normalize=overviewView,defaults=DEFAULT_OVERVIEW_VIEW}={}){
 let memory={...defaults};
 return {load(){try{const raw=getStorage().getItem(key),saved=raw?JSON.parse(raw):null;return {view:normalize(saved?.schemaVersion===1?saved.view:{}),persistent:true};}catch{return {view:{...memory},persistent:false};}},save(view){memory=normalize(view);try{getStorage().setItem(key,JSON.stringify({schemaVersion:1,view:memory}));return true;}catch{return false;}}};
}
export const overviewViewStore=createViewStateStore();

const watchView=value=>({query:typeof value?.query==='string'?value.query.slice(0,100):'',scrollY:Number.isFinite(value?.scrollY)&&value.scrollY>=0?Math.min(value.scrollY,1e7):0,tableLeft:0});
export const watchlistViewStores=Object.fromEntries(['all','TW','US'].map(m=>[m,createViewStateStore({key:'finance-school.watchlist-view.'+m+'.v1',normalize:watchView,defaults:watchView({})})]));
