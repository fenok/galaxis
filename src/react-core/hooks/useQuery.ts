import { useClient } from '../Provider';
import { useSubscription } from './useSubscription';
import { usePrevious } from './usePrevious';
import { NonUndefined, Query, QueryState, logger } from '../../core';
import { SsrPromisesManagerContext } from '../ssr';
import { useMemo, useCallback, useRef, useContext } from 'react';

export interface UseQueryOptions<C extends NonUndefined, R extends NonUndefined, E extends Error, I> {
    getQueryHash(query: Query<C, R, E, I>): string | number;
    isExpectedError(error: E | Error): boolean;
}

export function useQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Query<C, R, E, I>,
    { getQueryHash, isExpectedError }: UseQueryOptions<C, R, E, I>,
) {
    const queryHash = getQueryHash(query);
    const client = useClient<C>();
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);

    const abortControllerRef = useRef<AbortController>();

    const getAbortSignal = useCallback(() => {
        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
            abortControllerRef.current = new AbortController();
        }

        return abortControllerRef.current.signal;
    }, []);

    const refetch = useCallback(
        () => {
            return client.query({
                ...query,
                abortSignal: getAbortSignal(),
                fetchPolicy: 'cache-and-network',
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, queryHash],
    );

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    const prevClient = usePrevious(client);
    const prevQueryHash = usePrevious(queryHash);

    if (prevClient !== client || prevQueryHash !== queryHash) {
        abort();
        const queryPromise = client.query({ ...query, abortSignal: getAbortSignal() }).request?.catch(error => {
            if (!isExpectedError(error)) {
                logger.error('Got unexpected error:', error);
            }
            // Otherwise error is expected and is either in cache or discarded by next request
        });

        if (typeof window === 'undefined' && ssrPromisesManager && queryPromise) {
            ssrPromisesManager.addPromise(queryPromise);
        }
    }

    const subscription = useMemo(
        () => ({
            getCurrentQueryState: () => client.getQueryState(query),
            subscribe: (callback: (state: QueryState<R, E>) => void) => {
                return client.subscribe(query, callback);
            },
        }),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, queryHash],
    );

    const requestState = useSubscription(subscription);

    return { ...requestState, refetch, abort };
}
