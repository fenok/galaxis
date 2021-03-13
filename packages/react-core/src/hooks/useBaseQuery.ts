import { NonUndefined, BaseQuery } from '@fetcher/core';
import { useContext, useReducer, useRef } from 'react';
import { QueryProcessor } from './QueryProcessor';
import { useClient } from '../ClientProvider';
import { SsrPromisesManagerContext } from '../ssr';

export interface UseBaseQueryOptions<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    getQueryHash(query: BaseQuery<C, D, E, R>): string | number;
}

export function useBaseQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query: BaseQuery<C, D, E, R>,
    { getQueryHash }: UseBaseQueryOptions<C, D, E, R>,
) {
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);
    const client = useClient<C>();

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const queryProcessor = useRef<QueryProcessor<C, D, E, R>>();
    queryProcessor.current = queryProcessor.current || new QueryProcessor({ forceUpdate });

    const { loading, data, error, refetch, abort } = queryProcessor.current.onRender(
        query,
        getQueryHash(query),
        client,
        ssrPromisesManager,
    );

    return { loading, data, error, refetch, abort };
}
