import { CommonCacheOptions, NonUndefined } from '@fetcher/core';
import produce from 'immer';

export function immerify<CD extends NonUndefined, D extends NonUndefined, I>(
    toCache: (opts: CommonCacheOptions<CD, I> & { data: D }) => void,
): (opts: CommonCacheOptions<CD, I> & { data: D }) => CD {
    return ({ cacheData, ...params }) => {
        return produce(cacheData, (draft) => {
            toCache({ ...params, cacheData: draft as CD });
        });
    };
}
