export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network';

// Cache constraint
export type CC = object;
// Response data constraint
export type RC = string | number | boolean | symbol | bigint | object | null; // Anything but undefined
// Response error constraint
export type EC = Error;

export interface YarfRequest<C extends CC = any, R extends RC = any, E extends EC = any, I = any> {
    requestInit: I;
    fetchPolicy: FetchPolicy;
    lazy?: boolean;
    refetchQueries?: YarfRequest[];
    optimisticResponse?: R;
    disableSsr?: boolean;
    disableInitialRenderDataRefetchOptimization?: boolean;
    disableLoadingQueriesRefetchOptimization?: boolean;
    getNetworkRequestFactory(requestInit: I): (abortSignal?: AbortSignal) => Promise<R>;
    getId(requestInit: I): string;
    toCache?(cache: C, responseData: R, request: YarfRequest<C, R, E, I>, requesterId: string): C;
    fromCache?(cache: C, request: YarfRequest<C, R, E, I>, requesterId: string): R | undefined;
    clearCacheFromOptimisticResponse?(cache: C, optimisticResponse: R, request: YarfRequest<C, R, E, I>): C;
}
