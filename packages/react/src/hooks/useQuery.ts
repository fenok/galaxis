import { NonUndefined, Query, QueryManagerResult } from '@fetcher/core';
import { useContext, useEffect, useReducer, useRef } from 'react';
import { useClient } from '../providers';
import { SsrPromisesManagerContext } from '../ssr';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query?: Query<C, D, E, R>,
) {
    const client = useClient();
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const queryHash = query ? client.hash(query) : undefined;

    const queryManagerResult = useRef<[string | undefined, QueryManagerResult<D, E>, () => void]>();
    const onChange = useRef((result: QueryManagerResult<D, E>) => {
        if (queryManagerResult.current) {
            queryManagerResult.current[1] = result;
            forceUpdate();
        }
    });

    if (!queryManagerResult.current || queryManagerResult.current[0] !== queryHash) {
        queryManagerResult.current?.[2]();
        queryManagerResult.current = [
            queryHash,
            ...client.manageQuery<D, E, R>(query, onChange.current, ssrPromisesManager),
        ];
    }

    useEffect(() => {
        return () => {
            queryManagerResult.current?.[2]();
        };
    }, []);

    return queryManagerResult.current[1];
}
