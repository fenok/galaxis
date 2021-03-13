import { NonUndefined, Query, useQuery } from '@fetcher/react-core';
import { getHashBase64 } from '@fetcher/utils';
import { useCompleteQuery } from './commonQuery';

export type RichQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, I> = Query<C, D, E, I> &
    UseRichQueryOptions;

export interface UseRichQueryOptions {
    pollInterval?: number;
    lazy?: boolean;
}

export function useRichQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Partial<RichQuery<C, R, E, I>>,
) {
    return useQuery(useCompleteQuery<C, R, E, I>(query), { getQueryHash: getHashBase64 });
}

export function getRichQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, I, P>(
    factory: (params: P) => Partial<RichQuery<C, D, E, I>>,
): (query: Omit<Partial<RichQuery<C, D, E, I>>, 'requestInit'> & { requestInit: P }) => Partial<RichQuery<C, D, E, I>> {
    return ({ requestInit, ...query }) => ({
        ...factory(requestInit),
        ...query,
    });
}
