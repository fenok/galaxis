import { NonUndefined, BaseQuery, useBaseQuery } from '@fetcher/react-core';
import { getHashBase64 } from '@fetcher/utils';
import { useDefaultQueryMerger } from './useDefaultQueryMerger';

export type Query<C extends NonUndefined, D extends NonUndefined, E extends Error, I> = BaseQuery<C, D, E, I> &
    UseQueryOptions;

export interface UseQueryOptions {
    pollInterval?: number;
    lazy?: boolean;
}

export function useQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Partial<Query<C, R, E, I>>,
) {
    return useBaseQuery(useDefaultQueryMerger<C, R, E, I>(query), { getQueryHash: getHashBase64 });
}

export function getParametrizedQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, I, P>(
    factory: (params: P) => Partial<Query<C, D, E, I>>,
): (query: Omit<Partial<Query<C, D, E, I>>, 'requestParams'> & { requestParams: P }) => Partial<Query<C, D, E, I>> {
    return ({ requestParams, ...query }) => ({
        ...factory(requestParams),
        ...query,
    });
}
