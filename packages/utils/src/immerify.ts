import { CacheAndDataOptions, NonUndefined } from '@galaxis/core';
import produce from 'immer';

export function immerify<C extends NonUndefined, D extends NonUndefined, R>(
    toCache: (opts: CacheAndDataOptions<C, D, R>) => void,
): (opts: CacheAndDataOptions<C, D, R>) => C {
    return ({ cacheData, ...params }) => {
        return produce(cacheData, (draft) => {
            toCache({ ...params, cacheData: draft as C });
        });
    };
}
