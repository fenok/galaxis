import { NonUndefined } from './helpers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network';

export interface CommonCacheOptions<CD extends NonUndefined = null, I = unknown> {
    cacheData: CD;
    requestInit: I;
    requestId: string;
    requesterId: string;
}

export interface YarfRequest<
    CD extends NonUndefined = null,
    D extends NonUndefined = null,
    E extends Error = Error,
    I = unknown
> {
    requestInit: I;
    fetchPolicy: FetchPolicy;
    lazy?: boolean;
    refetchQueries?: YarfRequest<CD>[];
    disableSsr?: boolean;
    disableInitialRenderDataRefetchOptimization?: boolean;
    getNetworkRequestFactory(requestInit: I): (abortSignal?: AbortSignal) => Promise<D | E>;
    getId(requestInit: I): string;
    toCache(opts: CommonCacheOptions<CD, I> & { data: D }): CD;
    fromCache(opts: CommonCacheOptions<CD, I>): D | undefined;

    optimisticResponse?: {
        optimisticData: D;
        removeOptimisticData(opts: CommonCacheOptions<CD, I> & { optimisticData: D }): CD;
        isOptimisticData(opts: CommonCacheOptions<CD, I> & { data: D }): boolean;
    };
}
