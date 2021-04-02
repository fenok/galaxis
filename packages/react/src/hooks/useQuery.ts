import { NonUndefined, Query } from '@galaxis/core';
import { useContext, useEffect, useReducer, useRef } from 'react';
import { useClient } from '../providers';
import { SsrPromisesManagerContext } from '../ssr';
import { ManagedQueryWrapper } from './ManagedQueryWrapper';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query?: Query<C, D, E, R>,
) {
    const client = useClient();
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const managedQuery = useRef<ManagedQueryWrapper<C, D, E, R>>();
    managedQuery.current = managedQuery.current || new ManagedQueryWrapper(forceUpdate);

    useEffect(() => {
        return () => {
            managedQuery.current?.cleanup();
        };
    }, []);

    return managedQuery.current.process(query, client, ssrPromisesManager);
}
