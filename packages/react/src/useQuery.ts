import { NonUndefined, BaseQuery, useBaseQuery } from '@fetcher/react-core';
import { getHashBase64 } from '@fetcher/utils';
import { useDefaultQueryMerger } from './useDefaultQueryMerger';

export type Query<C extends NonUndefined, D extends NonUndefined, E extends Error, R> = BaseQuery<C, D, E, R> &
    UseQueryOptions;

export interface UseQueryOptions {
    pollInterval?: number;
    lazy?: boolean;
}

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query: Partial<Query<C, D, E, R>>,
) {
    return useBaseQuery(useDefaultQueryMerger<C, D, E, R>(query), { getQueryHash: getHashBase64 });
}

export function getParametrizedQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R, P>(
    factory: (params: P) => Partial<Query<C, D, E, R>>,
): (query: Omit<Partial<Query<C, D, E, R>>, 'requestParams'> & { requestParams: P }) => Partial<Query<C, D, E, R>> {
    return ({ requestParams, ...query }) => ({
        ...factory(requestParams),
        ...query,
    });
}
