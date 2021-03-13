import { NonUndefined, CommonCacheOptions } from '@fetcher/core';

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
