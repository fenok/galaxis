export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network';

export type NonUndefined = string | number | boolean | symbol | bigint | object | null;

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
    optimisticResponse?: D;
    disableSsr?: boolean;
    disableInitialRenderDataRefetchOptimization?: boolean;
    getNetworkRequestFactory(requestInit: I): (abortSignal?: AbortSignal) => Promise<D | E>;
    getId(requestInit: I): string;
    toCache(opts: { cacheData: CD; responseData: D; requestInit: I; requestId: string; requesterId: string }): CD;
    fromCache(opts: { cacheData: CD; requestInit: I; requestId: string; requesterId: string }): D | undefined;
    clearCacheFromOptimisticResponse?(opts: {
        cacheData: CD;
        optimisticResponseData: D;
        requestInit: I;
        requestId: string;
        requesterId: string;
    }): CD;
}
