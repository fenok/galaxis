import { useClient } from '../Provider';
import { useSubscription } from './useSubscription';
import { usePrevious } from './usePrevious';
import { NonUndefined, Query, logger, QueryCache, QueryRequestFlags } from '@fetcher/core';
import { SsrPromisesManagerContext } from '../ssr';
import { useMemo, useCallback, useRef, useContext, useEffect, useState } from 'react';
import { useIsUnmounted } from './useIsUnmounted';

export interface UseQueryOptions<C extends NonUndefined, R extends NonUndefined, E extends Error, I> {
    getQueryHash(query: Query<C, R, E, I>): string | number;
}

export function useQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Query<C, R, E, I>,
    { getQueryHash }: UseQueryOptions<C, R, E, I>,
) {
    const isUnmounted = useIsUnmounted();
    const queryHash = getQueryHash(query);
    const prevQueryHash = usePrevious(queryHash);
    const client = useClient<C>();
    const prevClient = usePrevious(client);
    const abortControllerRef = useRef<AbortController>();
    const requestFlagsRef = useRef<QueryRequestFlags>();
    const [queryRequestState, setQueryRequestState] = useState<{ loading: boolean; data?: R; error?: E | Error }>({
        loading: false,
    });
    const ssrPromisesManager = useContext(SsrPromisesManagerContext);
    const ssrPromiseAddedRef = useRef(false);
    const performQueryCallIdRef = useRef(1);

    const getAbortSignal = useCallback(() => {
        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
            abortControllerRef.current = new AbortController();
        }

        return abortControllerRef.current.signal;
    }, []);

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    const performQuery = useCallback(
        (requestFlags?: Partial<QueryRequestFlags>) => {
            abort();

            const performQueryCallId = ++performQueryCallIdRef.current;

            setQueryRequestState((prevState) => (!prevState.loading ? { ...prevState, loading: true } : prevState));

            const queryResult = client.query(
                {
                    ...query,
                    abortSignal: getAbortSignal(),
                },
                requestFlags,
            );

            return {
                ...queryResult,
                request: queryResult.request
                    ?.then((data) => {
                        if (!isUnmounted.current && performQueryCallId === performQueryCallIdRef.current) {
                            setQueryRequestState({ loading: false, error: undefined, data });
                        }

                        return data;
                    })
                    .catch((error) => {
                        if (!isUnmounted.current && performQueryCallId === performQueryCallIdRef.current) {
                            setQueryRequestState((prevRequestState) => ({
                                ...prevRequestState,
                                loading: false,
                                error,
                            }));
                        }

                        throw error;
                    }),
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, getAbortSignal, queryHash],
    );

    const refetch = useCallback(() => performQuery({ required: true }), [performQuery]);

    if (prevClient !== client || prevQueryHash !== queryHash) {
        const queryState = client.getQueryState(query);
        requestFlagsRef.current = queryState.requestFlags;

        if (!queryRequestState.loading) {
            if (queryState.requestFlags.required) {
                setQueryRequestState((prevRequestState) =>
                    prevRequestState.loading
                        ? prevRequestState
                        : {
                              ...prevRequestState,
                              loading: true,
                          },
                );
            }
        }

        if (typeof window === 'undefined' && ssrPromisesManager && !ssrPromiseAddedRef.current) {
            const queryResult = client.query(query, queryState.requestFlags);

            if (queryResult.request) {
                ssrPromisesManager.addPromise(queryResult.request);
                ssrPromiseAddedRef.current = true;
            }
        }
    }

    useEffect(() => {
        performQuery(requestFlagsRef.current);

        return () => {
            abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abort, client, getAbortSignal, queryHash]);

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

    useEffect(() => {
        if (
            process.env.NODE_ENV !== 'production' &&
            queryRequestState.error &&
            queryCache &&
            queryRequestState.error !== queryCache.error
        ) {
            logger.warn(
                'Query request promise returned an error that is different from the cached one:',
                queryRequestState.error,
            );
        }
    }, [queryCache, queryRequestState.error]);

    return { ...queryRequestState, ...queryCache, refetch, abort };
}
