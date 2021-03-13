import { NonUndefined } from './helpers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' | 'no-cache';

export interface CommonCacheOptions<C extends NonUndefined, R> {
    cacheData: C;
    requestParams: R;
    requestId: string;
}

export interface CommonRequestOptions<R> {
    requestParams: R;
}

export interface BaseRequest<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    requestParams: R;
    abortSignal?: AbortSignal;
    getRequestFactory(opts: CommonRequestOptions<R>): (abortSignal?: AbortSignal) => Promise<D | E>;
    getRequestId(opts: CommonRequestOptions<R>): string;
    toCache?(opts: CommonCacheOptions<C, R> & { data: D }): C;
}

export interface BaseQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseRequest<C, D, E, R> {
    fetchPolicy: FetchPolicy;
    disableSsr?: boolean;
    preventExcessRequestOnHydrate?: boolean;
    fromCache?(opts: CommonCacheOptions<C, R>): D | undefined;
}

export interface BaseMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseRequest<C, D, E, R> {
    optimisticData?: D;
    removeOptimisticData?(opts: CommonCacheOptions<C, R> & { data: D }): C;
}
