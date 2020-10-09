import { NonUndefined } from '../request';

export interface UpdateStateOpts<D extends NonUndefined> {
    updateCacheData?(prevCacheData: D): D;
    requestStates?: Record<
        string,
        {
            loading: string[];
            error?: Error | undefined;
        }
    >;
}

export interface Cache<D extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    updateState(opts: UpdateStateOpts<D>): void;
    getData(): D;
    getLoading(requestId: string): string[];
    getError(requestId: string): Error | undefined;
    extract(): unknown;
    purge(): void;
}
