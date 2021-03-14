import { CacheState, ErrorObject } from '@fetcher/in-memory-cache';
import { CacheData } from '../src/client/app/lib/CacheData';

declare global {
    interface Window {
        FETCHER_STATE?: CacheState<CacheData, ErrorObject>;
    }
}
