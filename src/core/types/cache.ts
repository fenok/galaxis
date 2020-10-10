import { NonUndefined } from './helpers';

export interface CacheRequestState {
    loading: string[];
    error: Error | undefined;
}

export interface UpdateStateOpts<D extends NonUndefined> {
    updateCacheData?(prevCacheData: D): D;
    updateRequestState?: {
        requestId: string;
        update(prevState: CacheRequestState): CacheRequestState;
    };
}

export interface Cache<D extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    updateState(opts: UpdateStateOpts<D>): void;
    getCacheData(): D;
    getRequestState(requestId: string): CacheRequestState;
    purge(): void;
}
