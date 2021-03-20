import { QueryManager, NonUndefined, Query } from '@fetcher/core';
import { useContext, useEffect, useReducer, useRef } from 'react';
import { useClient } from '../providers';
import { SsrPromisesManagerContext } from '../ssr';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(query: Query<C, D, E, R>) {
    const client = useClient<C>();
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const queryManager = useRef<QueryManager<C, D, E, R>>();
    queryManager.current = queryManager.current || new QueryManager({ forceUpdate });

    useEffect(() => {
        return () => {
            queryManager.current?.cleanup();
        };
    }, []);

    return queryManager.current.process(query, client, ssrPromisesManager ?? undefined);
}
