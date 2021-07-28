import { NonUndefined, FromCacheOptions, Resource } from '@galaxis/core';

const cache: Record<string, { deps: unknown[]; value: unknown } | undefined> = {};

export function memoize<TCacheData extends NonUndefined, TData extends NonUndefined, TResource extends Resource>(
    fromCache: (opts: FromCacheOptions<TCacheData, TResource>) => TData | undefined,
    getDeps: (opts: FromCacheOptions<TCacheData, TResource>) => unknown[],
) {
    if (typeof window !== 'undefined') {
        return (opts: FromCacheOptions<TCacheData, TResource>) => {
            const cacheEntry = cache[opts.requestId];
            const deps = getDeps(opts);
            if (!cacheEntry || cacheEntry.deps.some((cacheDep, cacheDepIndex) => cacheDep !== deps[cacheDepIndex])) {
                cache[opts.requestId] = { deps, value: fromCache(opts) };
            }

            return cache[opts.requestId]?.value as TData | undefined;
        };
    }

    return fromCache;
}
