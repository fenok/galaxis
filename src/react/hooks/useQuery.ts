import * as React from 'react';
import { RequestState } from '../../core/cache';
import { MultiAbortController } from '../../core/promise';
import { ClientContext, SsrPromisesManagerContext } from '../Provider';
import { PartialRequestData, BC, PPC, QPC, RC, SDC, EC, HC } from '../../core/request';
import { ensureClient } from './ensureClient';
import { getRequestId } from './getRequestId';
import { useId } from './useId';
import { useSubscription } from './useSubscription';
import { usePrevious } from './usePrevious';

interface QueryOptions<
    C extends SDC,
    R extends RC,
    E extends EC,
    P extends PPC,
    Q extends QPC,
    B extends BC,
    H extends HC
> {
    getPartialRequestId?(request: PartialRequestData<C, R, E, P, Q, B, H>): string | number;
}

export function useQuery<
    C extends SDC,
    R extends RC,
    E extends EC,
    P extends PPC,
    Q extends QPC,
    B extends BC,
    H extends HC
>(request: PartialRequestData<C, R, E, P, Q, B, H>, { getPartialRequestId }: QueryOptions<C, R, E, P, Q, B, H> = {}) {
    const callerId = useId();

    const client = React.useContext(ClientContext);
    const ssrPromisesManager = React.useContext(SsrPromisesManagerContext);

    ensureClient(client);

    const requestId = getRequestId(request, client, getPartialRequestId);

    const multiAbortControllerRef = React.useRef<MultiAbortController>();

    const getRequestOptions = React.useCallback(
        (respectLazy: boolean, forceNetworkRequest: boolean) => {
            if (!multiAbortControllerRef.current || multiAbortControllerRef.current.signal.aborted) {
                multiAbortControllerRef.current = new MultiAbortController();
            }

            return {
                callerId: callerId,
                forceNetworkRequest: forceNetworkRequest,
                respectLazy: respectLazy,
                multiAbortSignal: multiAbortControllerRef.current.signal,
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const refetch = React.useCallback(
        (forceNetworkRequest?: boolean) => {
            return client.query(request, getRequestOptions(false, Boolean(forceNetworkRequest)));
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
        client.prepareQueryLoadingState(request, getRequestOptions(true, false));
    }

    React.useEffect(() => {
        client.queryAfterPreparedLoadingState(request, getRequestOptions(true, false)).catch(() => {
            // Prevent uncaught error message (error will be in state)
        });

        return () => {
            abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, requestId]);

    if (typeof window === 'undefined' && ssrPromisesManager) {
        const ssrPromise = client.getSsrPromise(request, callerId);
        if (ssrPromise) {
            ssrPromisesManager.addPromise(ssrPromise);
        }
    }

    const subscription = React.useMemo(
        () => ({
            getCurrentValue: () => client.getState(request, { callerId }),
            subscribe: (callback: (state: RequestState<R, E>) => void) => {
                return client.subscribe(request, callerId, callback);
            },
        }),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestId],
    );

    const requestState = useSubscription(subscription);

    return { ...requestState, refetch, abort };
}
