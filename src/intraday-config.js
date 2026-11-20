// Public endpoint only. Fugle keys and access passwords stay out of build settings.
export function configuredIntradayOrigin(){
 return import.meta.env.VITE_INTRADAY_API_ORIGIN||'https://finance-school.alexchen109.workers.dev';
}
