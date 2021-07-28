import { NonUndefined, Query, ObservableQuery, Resource } from '@galaxis/core';
import { useContext, useEffect, useReducer, useRef } from 'react';
import { useClient } from '../providers';
import { SsrPromisesManagerContext } from '../ssr';
import { useMemoByHashObject } from './useMemoByHashObject';

export function useQuery<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource
>(query?: Query<TCacheData, TData, TError, TResource>) {
    const client = useClient();
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);

    const memoizedQuery = useMemoByHashObject(query, getHashObject.bind(null, client.requestId));

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const observableQuery = useRef<ObservableQuery<TCacheData, TData, TError, TResource>>();
    observableQuery.current =
        observableQuery.current || new ObservableQuery<TCacheData, TData, TError, TResource>(forceUpdate);

    observableQuery.current.setOptions(client, memoizedQuery);

    if (ssrPromisesManager) {
        const promise = observableQuery.current.start();
        if (promise) {
            ssrPromisesManager.addPromise(promise);
        }
    }

    useEffect(() => {
        observableQuery.current?.start()?.catch(() => {
            // Prevent unnecessary uncaught error message
        });
    }, [memoizedQuery]);

    useEffect(() => {
        return () => {
            observableQuery.current?.dispose();
        };
    }, []);

    return { ...observableQuery.current.getState(), refetch: observableQuery.current.refetch };
}

function getHashObject(
    hash: (resource: Resource) => string,
    query: Query<NonUndefined, NonUndefined, Error, Resource>,
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(query).map(([key, value]: [string, unknown]) => [
            key,
            key === 'resource' ? hash(value as Resource) : typeof value === 'function' ? value.toString() : value,
        ]),
    );
}
