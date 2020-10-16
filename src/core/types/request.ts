import { NonUndefined } from './helpers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' | 'no-cache';

export interface CommonCacheOptions<CD extends NonUndefined, I> {
    cacheData: CD;
    requestInit: I;
    requestId: string;
}

export interface CommonRequestOptions<I> {
    requestInit: I;
}

export interface BaseRequest<CD extends NonUndefined, D extends NonUndefined, E extends Error, I> {
    requestInit: I;
    abortSignal?: AbortSignal;
    getRequestFactory(opts: CommonRequestOptions<I>): (abortSignal?: AbortSignal) => Promise<D | E>;
    getRequestId(opts: CommonRequestOptions<I>): string;
    toCache?(opts: CommonCacheOptions<CD, I> & { data: D }): CD;

    optimisticData?: D;
    removeOptimisticData?(opts: CommonCacheOptions<CD, I> & { data: D }): CD;
    isOptimisticData?(opts: CommonCacheOptions<CD, I> & { data: D }): boolean;
}

export interface Query<CD extends NonUndefined, D extends NonUndefined, E extends Error, I>
    extends BaseRequest<CD, D, E, I> {
    fetchPolicy: FetchPolicy;
    disableSsr?: boolean;
    preventExcessRequestOnHydrate?: boolean;
    fromCache?(opts: CommonCacheOptions<CD, I>): D | undefined;
}

export interface Mutation<CD extends NonUndefined, D extends NonUndefined, E extends Error, I>
    extends BaseRequest<CD, D, E, I> {}
