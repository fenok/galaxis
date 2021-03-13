import { NonUndefined, CommonCacheOptions } from '@fetcher/core';

const cache: Record<string, { keys: any[]; value: unknown } | undefined> = {};

export function memoize<C extends NonUndefined, D extends NonUndefined, R>(
    fromCache: (opts: CommonCacheOptions<C, R>) => D | undefined,
    getKeys: (opts: CommonCacheOptions<C, R>) => any[],
) {
    if (typeof window !== 'undefined') {
        return (opts: CommonCacheOptions<C, R>) => {
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
