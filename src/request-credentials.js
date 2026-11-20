import {isCloudRuntime} from './intraday-config.js';
export function dataCredentials(target,base){
 if(!isCloudRuntime())return 'omit';
 try{return new URL(target,base||document.baseURI).origin===location.origin?'same-origin':'omit';}catch{return 'omit';}
}
