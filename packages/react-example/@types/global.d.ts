import { CacheState, ErrorObject } from '@galaxis/in-memory-cache';
import { CacheData } from '../src/client/app/lib/CacheData';

declare global {
    interface Window {
        GALAXIS_STATE?: CacheState<CacheData, ErrorObject>;
    }
}
