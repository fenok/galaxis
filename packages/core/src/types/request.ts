import { NonUndefined } from './helpers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' | 'no-cache';

export interface CacheOptions<C extends NonUndefined, R> {
    cacheData: C;
    requestParams: R;
    requestId: string;
}

export type CacheOptionsWithData<C extends NonUndefined, D extends NonUndefined, R> = CacheOptions<C, R> & { data: D };

export interface RequestOptions<R> {
    requestParams: R;
}

export interface BaseRequest<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    requestParams: R;
    abortSignal?: AbortSignal;
    getRequestFactory(opts: RequestOptions<R>): (abortSignal?: AbortSignal) => Promise<D | E>;
    getRequestId(opts: RequestOptions<R>): string;
    toCache?(opts: CacheOptionsWithData<C, D, R>): C;
}

export interface BaseQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseRequest<C, D, E, R> {
    fetchPolicy: FetchPolicy;
    disableSsr?: boolean;
    preventExcessRequestOnHydrate?: boolean;
    forceNewRequestOnMerge?: boolean;
    softAbortSignal?: AbortSignal;
    fromCache?(opts: CacheOptions<C, R>): D | undefined;
}

export interface BaseMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseRequest<C, D, E, R> {
    optimisticData?: D;
    removeOptimisticData?(opts: CacheOptionsWithData<C, D, R>): C;
}

export interface Query<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseQuery<C, D, E, R> {
    lazy?: boolean;
}

export interface Mutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>
    extends BaseMutation<C, D, E, R> {}
