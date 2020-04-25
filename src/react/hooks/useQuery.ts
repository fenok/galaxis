import * as React from 'react';
import { RequestState } from '../../core/cache';
import { MultiAbortController } from '../../core/promise';
import { BC, PPC, QPC, RC, SDC, EC, HC } from '../../core/request/types';
import { ClientContext, SsrPromisesManagerContext } from '../Provider';
import { PartialRequestData } from '../../core/request';
import { ensureClient } from './ensureClient';
import { getRequestId } from './getRequestId';
import { useId } from './useId';
import { useSubscription } from './useSubscription';

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

    const subscription = React.useMemo(
        () => ({
            getCurrentValue: (mount: boolean, update: boolean) =>
                client.getState(request, {
                    callerId,
                    overrideWithInitialMountState: mount,
                    overrideWithInitialUpdateState: update,
                }),
            subscribe: (callback: (state: RequestState<R, E>) => void) => {
                return client.subscribe(request, callerId, callback);
            },
        }),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestId, callerId],
    );

    const multiAbortControllerRef = React.useRef<MultiAbortController>();

    if (typeof window === 'undefined') {
        const ssrPromise = client.getSsrPromise(request, callerId);
        ssrPromise && ssrPromisesManager?.addPromise(ssrPromise);
    }

    const query = React.useCallback(
        (respectLazy: boolean, forceNetworkRequest: boolean) => {
            if (!multiAbortControllerRef.current || multiAbortControllerRef.current.signal.aborted) {
                multiAbortControllerRef.current = new MultiAbortController();
            }

            return client.query(request, {
                callerId: callerId,
                forceNetworkRequest: forceNetworkRequest,
                respectLazy: respectLazy,
                multiAbortSignal: multiAbortControllerRef.current.signal,
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestId, callerId],
    );

    const refetch = React.useCallback(
        (forceNetworkRequest?: boolean) => {
            return query(false, Boolean(forceNetworkRequest));
        },
        [query],
    );

    const abort = React.useCallback((multi?: boolean) => {
        if (multiAbortControllerRef.current) {
            multiAbortControllerRef.current.abort(multi);
        }
    }, []);

    React.useEffect(() => {
        query(true, false).catch(() => {
            // Prevent uncaught error message (error will be in state)
        });

        return () => {
            abort();
        };
    }, [query, abort]);

    /**
     * Ordering is crucial. Subscription effect must run after query effect, which guarantees that request state is
     * updated AFTER this component's query.
     */
    const requestState = useSubscription(subscription);

    return { ...requestState, refetch, abort };
}
