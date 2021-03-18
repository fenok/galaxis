import { QueryManager, NonUndefined, Query } from '@fetcher/core';
import { useContext, useEffect, useReducer, useRef } from 'react';
import { RequestHashGetterContext, useClient } from '../providers';
import { SsrPromisesManagerContext } from '../ssr';
import { useDefaultQueryMerger } from './useDefaultQueryMerger';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query: Partial<Query<C, D, E, R>>,
) {
    const client = useClient<C>();
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);
    const getQueryHash = useContext(RequestHashGetterContext);

    const completeQuery = useDefaultQueryMerger<C, D, E, R>(query);

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const queryManager = useRef<QueryManager<C, D, E, R>>();
    queryManager.current = queryManager.current || new QueryManager({ forceUpdate });

    const currentQueryHash = getQueryHash(completeQuery);
    const savedQuery = useRef<[string | number, Query<C, D, E, R>]>();
    savedQuery.current =
        savedQuery.current?.[0] === currentQueryHash ? savedQuery.current : [currentQueryHash, completeQuery];

    useEffect(() => {
        return () => {
            queryManager.current?.cleanup();
        };
    }, []);

    return queryManager.current.process(savedQuery.current[1], client, ssrPromisesManager ?? undefined);
}
