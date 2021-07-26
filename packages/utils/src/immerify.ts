import { ToCacheOptions, NonUndefined, Resource } from '@galaxis/core';
import produce from 'immer';

export function immerify<C extends NonUndefined, D extends NonUndefined, R extends Resource>(
    toCache: (opts: ToCacheOptions<C, D, R>) => void,
): (opts: ToCacheOptions<C, D, R>) => C {
    return ({ cacheData, ...params }) => {
        return produce(cacheData, (draft) => {
            toCache({ ...params, cacheData: draft as C });
        });
    };
}
