import { NonUndefined, Query, useBaseQuery } from '@fetcher/react-core';
import { getHashBase64 } from '@fetcher/utils';
import { useDefaultQueryMerger } from './useDefaultQueryMerger';

export type RichQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, I> = Query<C, D, E, I> &
    UseRichQueryOptions;

export interface UseRichQueryOptions {
    pollInterval?: number;
    lazy?: boolean;
}

export function useQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Partial<RichQuery<C, R, E, I>>,
) {
    return useBaseQuery(useDefaultQueryMerger<C, R, E, I>(query), { getQueryHash: getHashBase64 });
}

export function getRichQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, I, P>(
    factory: (params: P) => Partial<RichQuery<C, D, E, I>>,
): (query: Omit<Partial<RichQuery<C, D, E, I>>, 'requestInit'> & { requestInit: P }) => Partial<RichQuery<C, D, E, I>> {
    return ({ requestInit, ...query }) => ({
        ...factory(requestInit),
        ...query,
    });
}
