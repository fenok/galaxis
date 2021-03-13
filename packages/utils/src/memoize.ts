import { NonUndefined, CacheOptions } from '@fetcher/core';

const cache: Record<string, { keys: any[]; value: unknown } | undefined> = {};

export function memoize<C extends NonUndefined, D extends NonUndefined, R>(
    fromCache: (opts: CacheOptions<C, R>) => D | undefined,
    getKeys: (opts: CacheOptions<C, R>) => any[],
) {
    if (typeof window !== 'undefined') {
        return (opts: CacheOptions<C, R>) => {
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
