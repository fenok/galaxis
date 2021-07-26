import { NonUndefined, Query, ObservableQuery, Resource } from '@galaxis/core';
import { useContext, useEffect, useReducer, useRef } from 'react';
import { useClient } from '../providers';
import { SsrPromisesManagerContext } from '../ssr';
import { useMemoByHash } from './useMemoByHash';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource>(
    query?: Query<C, D, E, R>,
) {
    const client = useClient();
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);

    const memoizedQuery = useMemoByHash(query, client.hash);

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const observableQuery = useRef<ObservableQuery<C, D, E, R>>();
    observableQuery.current = observableQuery.current || new ObservableQuery<C, D, E, R>(forceUpdate);

    observableQuery.current.setOptions(client, memoizedQuery);

    if (ssrPromisesManager) {
        const promise = observableQuery.current.start();
        if (promise) {
            ssrPromisesManager.addPromise(promise);
        }
    }

    useEffect(() => {
        observableQuery.current?.start();
    }, [memoizedQuery]);

    useEffect(() => {
        return () => {
            observableQuery.current?.dispose();
        };
    }, []);

    return { ...observableQuery.current.getState(), refetch: observableQuery.current.refetch };
}
