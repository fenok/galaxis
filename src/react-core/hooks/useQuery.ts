import { useClient } from '../Provider';
import { useSubscription } from './useSubscription';
import { usePrevious } from './usePrevious';
import { NonUndefined, Query, logger, QueryCache, QueryRequestFlags } from '../../core';
import { SsrPromisesManagerContext } from '../ssr';
import { useMemo, useCallback, useRef, useContext, useEffect, useState } from 'react';

export interface UseQueryOptions<C extends NonUndefined, R extends NonUndefined, E extends Error, I> {
    getQueryHash(query: Query<C, R, E, I>): string | number;
    isExpectedError(error: E | Error): boolean;
}

export function useQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Query<C, R, E, I>,
    { getQueryHash, isExpectedError }: UseQueryOptions<C, R, E, I>,
) {
    const queryHash = getQueryHash(query);
    const prevQueryHash = usePrevious(queryHash);
    const client = useClient<C>();
    const prevClient = usePrevious(client);
    const abortControllerRef = useRef<AbortController>();
    const requestFlagsRef = useRef<QueryRequestFlags>();
    const [loading, setLoading] = useState(false);
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);

    const getAbortSignal = useCallback(() => {
        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
            abortControllerRef.current = new AbortController();
        }

        return abortControllerRef.current.signal;
    }, []);

    const refetch = useCallback(
        () => {
            return client.query(
                {
                    ...query,
                    abortSignal: getAbortSignal(),
                },
                { required: true },
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, getAbortSignal, queryHash],
    );

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    if (prevClient !== client || prevQueryHash !== queryHash) {
        const queryState = client.getQueryState(query);
        requestFlagsRef.current = queryState.requestFlags;

        if (queryState.requestFlags.required) {
            setLoading(true);
        }

        if (typeof window === 'undefined' && ssrPromisesManager) {
            const queryResult = client.query(query, queryState.requestFlags);

            if (queryResult.request) {
                ssrPromisesManager.addPromise(queryResult.request);
            }
        }
    }

    useEffect(() => {
        client
            .query({ ...query, abortSignal: getAbortSignal() }, requestFlagsRef.current)
            .request?.catch(error => {
                if (!isExpectedError(error)) {
                    logger.error('Got unexpected error:', error);
                }
                // Otherwise error is expected and is either in cache or discarded by next request
            })
            .finally(() => {
                setLoading(false);
            });

        return () => {
            abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abort, client, getAbortSignal, isExpectedError, queryHash]);

    const subscription = useMemo(
        () => ({
            getCurrentQueryCache: () => client.getQueryState(query).cache,
            subscribe: (callback: (cache?: QueryCache<R, E>) => void) => {
                return client.subscribe(query, ({ cache }) => callback(cache));
            },
        }),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, queryHash],
    );

    const queryCache = useSubscription(subscription, { disableSubscription: query.fetchPolicy === 'no-cache' });

    return { ...queryCache, loading, refetch, abort };
}
