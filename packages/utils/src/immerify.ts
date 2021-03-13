import { CacheOptionsWithData, NonUndefined } from '@fetcher/core';
import produce from 'immer';

export function immerify<C extends NonUndefined, D extends NonUndefined, R>(
    toCache: (opts: CacheOptionsWithData<C, D, R>) => void,
): (opts: CacheOptionsWithData<C, D, R>) => C {
    return ({ cacheData, ...params }) => {
        return produce(cacheData, (draft) => {
            toCache({ ...params, cacheData: draft as C });
        });
    };
}
