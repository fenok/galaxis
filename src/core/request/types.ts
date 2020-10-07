export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network';

// Response data constraint
export type ResponseData = string | number | boolean | symbol | bigint | object | null; // Anything but undefined

export interface YarfRequest<CD = unknown, D extends ResponseData = null, E extends Error = Error, I = unknown> {
    requestInit: I;
    fetchPolicy: FetchPolicy;
    lazy?: boolean;
    refetchQueries?: YarfRequest[];
    optimisticResponse?: D;
    disableSsr?: boolean;
    disableInitialRenderDataRefetchOptimization?: boolean;
    disableLoadingQueriesRefetchOptimization?: boolean;
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
