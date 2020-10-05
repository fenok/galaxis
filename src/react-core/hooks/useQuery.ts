import * as React from 'react';
import { RequestState } from '../../core/cache';
import { MultiAbortController } from '../../core/promise';
import { ClientContext, SsrPromisesManagerContext } from '../Provider';
import { RC, CC, EC, YarfRequest } from '../../core/request';
import { ensureClient } from './ensureClient';
import { getRequestId } from './getRequestId';
import { useId } from './useId';
import { useSubscription } from './useSubscription';
import { usePrevious } from './usePrevious';

interface QueryOptions<C extends CC, R extends RC, E extends EC, I> {
    requesterId?: string;
    getPartialRequestId?(request: YarfRequest<C, R, E, I>): string | number;
}

export function useQuery<C extends CC, R extends RC, E extends EC, I>(
    request: YarfRequest<C, R, E, I>,
    { getPartialRequestId, requesterId: outerRequesterId }: QueryOptions<C, R, E, I> = {},
) {
    const requesterId = useId(outerRequesterId);

    const client = React.useContext(ClientContext);
    const ssrPromisesManager = React.useContext(SsrPromisesManagerContext);

    ensureClient(client);

    const requestId = getRequestId(request, getPartialRequestId);

    const multiAbortControllerRef = React.useRef<MultiAbortController>();

    const getRequestOptions = React.useCallback(
        (respectLazy: boolean, forceNetworkRequest: boolean, disableNetworkRequestOptimization: boolean) => {
            if (!multiAbortControllerRef.current || multiAbortControllerRef.current.signal.aborted) {
                multiAbortControllerRef.current = new MultiAbortController();
            }

            return {
                requesterId,
                forceNetworkRequest,
                disableNetworkRequestOptimization,
                respectLazy,
                multiAbortSignal: multiAbortControllerRef.current.signal,
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const refetch = React.useCallback(
        (disableNetworkRequestOptimization?: boolean) => {
            return client.query(request, getRequestOptions(false, true, Boolean(disableNetworkRequestOptimization)));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestId],
    );

    const abort = React.useCallback((multi?: boolean) => {
        if (multiAbortControllerRef.current) {
            multiAbortControllerRef.current.abort(multi);
        }
    }, []);

    const prevClient = usePrevious(client);
    const prevRequestId = usePrevious(requestId);

    if (prevClient !== client || prevRequestId !== requestId) {
        client.prepareQueryLoadingState(request, getRequestOptions(true, false, false));
    }

    React.useEffect(() => {
        client.queryAfterPreparedLoadingState(request, getRequestOptions(true, false, false)).catch(() => {
            // Prevent uncaught error message (error will be in state)
        });

        return () => {
            abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, requestId]);

    if (typeof window === 'undefined' && ssrPromisesManager) {
        const ssrPromise = client.getSsrPromise(request, requesterId);
        if (ssrPromise) {
            ssrPromisesManager.addPromise(ssrPromise);
        }
    }

    const subscription = React.useMemo(
        () => ({
            getCurrentValue: () => client.getState(request, { requesterId }),
            subscribe: (callback: (state: RequestState<R, E>) => void) => {
                return client.subscribe(request, requesterId, callback);
            },
        }),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestId],
    );

    const requestState = useSubscription(subscription);

    return { ...requestState, requesterId: requesterId, refetch, abort };
}
