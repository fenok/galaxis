import { NonUndefined, Query, useQuery, CommonCacheOptions } from '@fetcher/react-core';
import { useCompleteQuery } from './commonQuery';
import { getHashBase64 } from './getHashBase64';
import produce from 'immer';

export type RichQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, I> = Query<C, D, E, I> &
    UseRichQueryOptions;

export interface UseRichQueryOptions {
    pollInterval?: number;
    lazy?: boolean;
}

export function useRichQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Partial<RichQuery<C, R, E, I>>,
) {
    return useQuery(useCompleteQuery<C, R, E, I>(query), { getQueryHash: getHashBase64 });
}

export function getRichQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, I, P>(
    factory: (params: P) => Partial<RichQuery<C, D, E, I>>,
): (query: Omit<Partial<RichQuery<C, D, E, I>>, 'requestInit'> & { requestInit: P }) => Partial<RichQuery<C, D, E, I>> {
    return ({ requestInit, ...query }) => ({
        ...factory(requestInit),
        ...query,
    });
}

const cache: Record<string, { keys: any[]; value: unknown } | undefined> = {};

export function memoize<CD extends NonUndefined, D extends NonUndefined, I>(
    fromCache: (opts: CommonCacheOptions<CD, I>) => D | undefined,
    getKeys: (opts: CommonCacheOptions<CD, I>) => any[],
) {
    if (typeof window !== 'undefined') {
        return (opts: CommonCacheOptions<CD, I>) => {
            const cacheEntry = cache[opts.requestId];
            const keys = getKeys(opts);
            if (!cacheEntry || cacheEntry.keys.some((cacheKey, cacheKeyIndex) => cacheKey !== keys[cacheKeyIndex])) {
                cache[opts.requestId] = { keys, value: fromCache(opts) };
            }

            return cache[opts.requestId]?.value as D | undefined;
        };
    }

    return fromCache;
}

export function immerify<CD extends NonUndefined, D extends NonUndefined, I>(
    toCache: (opts: CommonCacheOptions<CD, I> & { data: D }) => void,
): (opts: CommonCacheOptions<CD, I> & { data: D }) => CD {
    return ({ cacheData, ...params }) => {
        return produce(cacheData, (draft) => {
            toCache({ ...params, cacheData: draft as CD });
        });
    };
}
