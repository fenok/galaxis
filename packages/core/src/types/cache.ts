import { NonUndefined } from './helpers';

export interface UpdateStateOptions<C extends NonUndefined> {
    updateCacheData?(prevCacheData: C): C;
    updateRequestError?: {
        requestId: string;
        update(prevError: Error | undefined): Error | undefined;
    };
}

export interface Cache<C extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    updateState(opts: UpdateStateOptions<C>): void;
    getCacheData(): C;
    getRequestError(requestId: string): Error | undefined;
    purge(): void;
}
