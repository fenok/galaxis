import { CommonCacheOptions, NonUndefined } from '@fetcher/core';
import produce from 'immer';

export function immerify<C extends NonUndefined, D extends NonUndefined, R>(
    toCache: (opts: CommonCacheOptions<C, R> & { data: D }) => void,
): (opts: CommonCacheOptions<C, R> & { data: D }) => C {
    return ({ cacheData, ...params }) => {
        return produce(cacheData, (draft) => {
            toCache({ ...params, cacheData: draft as C });
        });
    };
}
