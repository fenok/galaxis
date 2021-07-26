import { NonUndefined, FromCacheOptions, Resource } from '@galaxis/core';

const cache: Record<string, { deps: unknown[]; value: unknown } | undefined> = {};

export function memoize<C extends NonUndefined, D extends NonUndefined, R extends Resource>(
    fromCache: (opts: FromCacheOptions<C, R>) => D | undefined,
    getDeps: (opts: FromCacheOptions<C, R>) => unknown[],
) {
    if (typeof window !== 'undefined') {
        return (opts: FromCacheOptions<C, R>) => {
            const cacheEntry = cache[opts.requestId];
            const deps = getDeps(opts);
            if (!cacheEntry || cacheEntry.deps.some((cacheDep, cacheDepIndex) => cacheDep !== deps[cacheDepIndex])) {
                cache[opts.requestId] = { deps, value: fromCache(opts) };
            }

            return cache[opts.requestId]?.value as D | undefined;
        };
    }

    return fromCache;
}
