import { NonUndefined } from './helpers';
import { MultiAbortSignal } from '../promise/controllers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network';

export interface CommonCacheOptions<CD extends NonUndefined, I> {
    cacheData: CD;
    requestInit: I;
    requestId: string;
    requesterId: string;
}

export interface BaseRequestInit<CD extends NonUndefined, D extends NonUndefined, E extends Error, I> {
    requesterId: string;
    requestInit: I;
    abortSignal?: MultiAbortSignal | AbortSignal;
    getNetworkRequestFactory(requestInit: I): (abortSignal?: AbortSignal) => Promise<D | E>;
    getRequestId(requestInit: I): string;
    toCache(opts: CommonCacheOptions<CD, I> & { data: D }): CD;

    optimisticResponse?: {
        optimisticData: D;
        removeOptimisticData(opts: CommonCacheOptions<CD, I> & { data: D }): CD;
        isOptimisticData(opts: CommonCacheOptions<CD, I> & { data: D }): boolean;
    };
}

export interface QueryInit<CD extends NonUndefined, D extends NonUndefined, E extends Error, I>
    extends BaseRequestInit<CD, D, E, I> {
    fetchPolicy: FetchPolicy;
    disableSsr?: boolean;
    preventExcessNetworkRequestOnHydrate?: boolean;
    rerunExistingNetworkRequest?: boolean;
    fromCache(opts: CommonCacheOptions<CD, I>): D | undefined;
}

export interface MutationInit<CD extends NonUndefined, D extends NonUndefined, E extends Error, I>
    extends BaseRequestInit<CD, D, E, I> {
    refetchQueries?: QueryInit<CD, any, any, any>[];
}
