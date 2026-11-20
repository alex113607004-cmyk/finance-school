export function isLocalRuntime(){
 return typeof document!=='undefined'&&document.querySelector('meta[name="finance-school-mode"]')?.content==='local'&&location.hostname==='127.0.0.1';
}
// Local mode never sends keys or passwords to a hosted service.
export function configuredIntradayOrigin(){
 return isLocalRuntime()?location.origin:import.meta.env.VITE_INTRADAY_API_ORIGIN||'';
}
