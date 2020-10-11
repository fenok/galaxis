import { NonUndefined } from './helpers';
import { MultiAbortSignal } from '../promise/controllers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network';

export interface CommonCacheOptions<CD extends NonUndefined = null, I = unknown> {
    cacheData: CD;
    requestInit: I;
    requestId: string;
    requesterId: string;
}

export interface CommonRequest<
    CD extends NonUndefined = null,
    D extends NonUndefined = null,
    E extends Error = Error,
    I = unknown
> {
    requesterId: string;
    requestInit: I;
    abortSignal?: MultiAbortSignal | AbortSignal;
    getNetworkRequestFactory(requestInit: I): (abortSignal?: AbortSignal) => Promise<D | E>;
    getRequestId(requestInit: I): string;
    toCache(opts: CommonCacheOptions<CD, I> & { data: D }): CD;

    optimisticResponse?: {
        optimisticData: D;
        removeOptimisticData(opts: CommonCacheOptions<CD, I> & { optimisticData: D }): CD;
        isOptimisticData(opts: CommonCacheOptions<CD, I> & { data: D }): boolean;
    };
}

export interface QueryInit<
    CD extends NonUndefined = null,
    D extends NonUndefined = null,
    E extends Error = Error,
    I = unknown
> extends CommonRequest<CD, D, E, I> {
    fetchPolicy: FetchPolicy;
    disableSsr?: boolean;
    enableInitialRenderDataRefetchOptimization?: boolean;
    forceNetworkRequest?: boolean; // TODO: Remove? The same can be achieved by using cache-and-network fetch policy
    rerunExistingNetworkRequest?: boolean;
    fromCache(opts: CommonCacheOptions<CD, I>): D | undefined;
}

export interface MutationInit<
    CD extends NonUndefined = null,
    D extends NonUndefined = null,
    E extends Error = Error,
    I = unknown
> extends CommonRequest<CD, D, E, I> {
    refetchQueries?: QueryInit<CD>[];
}
