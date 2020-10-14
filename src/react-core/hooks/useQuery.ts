import * as React from 'react';
import { SsrPromisesManagerContext, useClient } from '../Provider';
import { ensureClient } from './ensureClient';
import { getRequestHash } from './getRequestHash';
import { useId } from './useId';
import { useSubscription } from './useSubscription';
import { usePrevious } from './usePrevious';
import { NonUndefined, Query, RequestState } from '../../core';

interface UseQueryOptions<C extends NonUndefined, R extends NonUndefined, E extends Error, I> {
    requesterId?: string;
    getRequestHash?(request: Query<C, R, E, I>): string | number;
}

export function useQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    request: Query<C, R, E, I>,
    { getRequestHash: getRequestHashOuter, requesterId: outerRequesterId }: UseQueryOptions<C, R, E, I> = {},
) {
    const requesterId = useId(outerRequesterId);

    const client = useClient<C>();
    const ssrPromisesManager = React.useContext(SsrPromisesManagerContext);

    ensureClient(client);

    const requestHash = getRequestHash(request, getRequestHashOuter);

    const multiAbortControllerRef = React.useRef<AbortController>();

    const getAbortSignal = React.useCallback(() => {
        if (!multiAbortControllerRef.current || multiAbortControllerRef.current.signal.aborted) {
            multiAbortControllerRef.current = new AbortController();
        }

        return multiAbortControllerRef.current.signal;
    }, []);

    const refetch = React.useCallback(
        () => {
            return client.query({
                ...request,
                abortSignal: getAbortSignal(),
                fetchPolicy: 'cache-and-network',
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestHash],
    );

    const abort = React.useCallback(() => {
        if (multiAbortControllerRef.current) {
            multiAbortControllerRef.current.abort();
        }
    }, []);

    const prevClient = usePrevious(client);
    const prevRequestId = usePrevious(requestHash);

    if (prevClient !== client || prevRequestId !== requestHash) {
        abort();
        const queryPromise = client.query({ ...request, abortSignal: getAbortSignal() }).request?.catch(() => {
            // Prevent uncaught error message (error will be in state)
            // TODO: log unexpected (non-network) errors
        });

        if (typeof window === 'undefined' && ssrPromisesManager && queryPromise) {
            ssrPromisesManager.addPromise(queryPromise);
        }
    }

    const subscription = React.useMemo(
        () => ({
            getCurrentValue: () => client.getState(request),
            subscribe: (callback: (state: RequestState<R, E>) => void) => {
                return client.subscribe(request, callback);
            },
        }),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestHash],
    );

    const requestState = useSubscription(subscription);

    return { ...requestState, requesterId: requesterId, refetch, abort };
}
