import { ToCacheOptions, NonUndefined, Resource } from '@galaxis/core';
import produce from 'immer';

export function immerify<TCacheData extends NonUndefined, TData extends NonUndefined, TResource extends Resource>(
    toCache: (opts: ToCacheOptions<TCacheData, TData, TResource>) => void,
): (opts: ToCacheOptions<TCacheData, TData, TResource>) => TCacheData {
    return ({ cacheData, ...params }) => {
        return produce(cacheData, (draft) => {
            toCache({ ...params, cacheData: draft as TCacheData });
        });
    };
}
