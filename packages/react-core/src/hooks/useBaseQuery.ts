import { BaseQuery, QueryManager, NonUndefined } from '@fetcher/core';
import { useContext, useEffect, useReducer, useRef } from 'react';
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

    const queryManager = useRef<QueryManager<C, D, E, R>>();
    queryManager.current = queryManager.current || new QueryManager({ forceUpdate });

    const currentQueryHash = getQueryHash(query);
    const savedQuery = useRef<[string | number, BaseQuery<C, D, E, R>]>();
    savedQuery.current = savedQuery.current?.[0] === currentQueryHash ? savedQuery.current : [currentQueryHash, query];

    useEffect(() => {
        return () => {
            queryManager.current?.cleanup();
        };
    }, []);

    return queryManager.current.process(savedQuery.current[1], client, ssrPromisesManager ?? undefined);
}
