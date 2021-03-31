import { NonUndefined } from './helpers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' | 'no-cache';

export interface CacheOptions<C extends NonUndefined, R> {
    cacheData: C;
    requestParams: R;
    requestId: string;
}

export type CacheAndDataOptions<C extends NonUndefined, D extends NonUndefined, R> = CacheOptions<C, R> & { data: D };

export interface RequestOptions<R> {
    requestParams: R;
}

export interface BaseRequest<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    requestParams: R;
    abortSignal?: AbortSignal;
    getRequestFactory?(opts: RequestOptions<R>): (abortSignal?: AbortSignal) => Promise<D>;
    getRequestId?(opts: RequestOptions<R>): string;
    toCache?(opts: CacheAndDataOptions<C, D, R>): C;
    __errorType?: E;
}

export interface Query<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseRequest<C, D, E, R> {
    fetchPolicy?: FetchPolicy;
    lazy?: boolean;
    disableSsr?: boolean;
    optimizeOnHydrate?: boolean;
    forceRequestOnMerge?: boolean;
    softAbortSignal?: AbortSignal;
    fromCache?(opts: CacheOptions<C, R>): D | undefined;
}

export interface Mutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseRequest<C, D, E, R> {
    optimisticData?: D;
    removeOptimisticData?(opts: CacheAndDataOptions<C, D, R>): C;
}
