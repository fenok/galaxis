import { NonUndefined } from './helpers';

export interface UpdateStateOpts<D extends NonUndefined> {
    updateCacheData?(prevCacheData: D): D;
    updateRequestError?: {
        requestId: string;
        update(prevError: Error | undefined): Error | undefined;
    };
}

export interface Cache<D extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    updateState(opts: UpdateStateOpts<D>): void;
    getCacheData(): D;
    getRequestError(requestId: string): Error | undefined;
    purge(): void;
}
