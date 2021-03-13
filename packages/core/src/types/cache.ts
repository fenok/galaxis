import { NonUndefined } from './helpers';

export interface UpdateStateOpts<C extends NonUndefined> {
    updateCacheData?(prevCacheData: C): C;
    updateRequestError?: {
        requestId: string;
        update(prevError: Error | undefined): Error | undefined;
    };
}

export interface Cache<C extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    updateState(opts: UpdateStateOpts<C>): void;
    getCacheData(): C;
    getRequestError(requestId: string): Error | undefined;
    purge(): void;
}
