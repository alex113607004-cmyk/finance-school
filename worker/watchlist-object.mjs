import {DurableObject} from 'cloudflare:workers';
import {createWatchlistStorage} from './watchlist-storage.mjs';
export class WatchlistStorage extends DurableObject {
 fetch(request){return createWatchlistStorage(this.ctx.storage).fetch(request);}
}
