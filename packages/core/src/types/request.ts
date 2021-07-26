import { NonUndefined } from './helpers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' | 'no-cache';

export interface Resource {
    key: string;
}

export interface FromCacheOptions<C extends NonUndefined, R extends Resource> {
    cacheData: C;
    resource: R;
    requestId: string;
}

export interface ToCacheOptions<C extends NonUndefined, D extends NonUndefined, R extends Resource>
    extends FromCacheOptions<C, R> {
    data: D;
}

export interface BaseRequest<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource> {
    resource: R;
    abortSignal?: AbortSignal;
    request?(resource: R, abortSignal?: AbortSignal): Promise<D>;
    toCache?(opts: ToCacheOptions<C, D, R>): C;
    __errorType?: E;
}

export interface Query<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource>
    extends BaseRequest<C, D, E, R> {
    fetchPolicy?: FetchPolicy;
    disableSsr?: boolean;
    optimizeOnHydrate?: boolean;
    forceRequestOnMerge?: boolean;
    softAbortSignal?: AbortSignal;
    fromCache?(opts: FromCacheOptions<C, R>): D | undefined;
}

export interface Mutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource>
    extends BaseRequest<C, D, E, R> {
    fetchPolicy?: Extract<FetchPolicy, 'cache-and-network' | 'no-cache'>;
    optimisticData?: D;
    removeOptimisticData?(opts: ToCacheOptions<C, D, R>): C;
}
