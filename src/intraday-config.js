export function isLocalRuntime(){
 return typeof document!=='undefined'&&document.querySelector('meta[name="finance-school-mode"]')?.content==='local'&&location.hostname==='127.0.0.1';
}
export function isCloudRuntime(){
 return typeof document!=='undefined'&&document.querySelector('meta[name="finance-school-mode"]')?.content==='cloud'&&location.protocol==='https:'&&(location.hostname==='finance-school.alexchen109.workers.dev'||/^[a-z0-9-]+-finance-school\.alexchen109\.workers\.dev$/.test(location.hostname));
}
// Local mode never sends keys or passwords to a hosted service.
export function configuredIntradayOrigin(){
 return isLocalRuntime()||isCloudRuntime()?location.origin:import.meta.env.VITE_INTRADAY_API_ORIGIN||'';
}
