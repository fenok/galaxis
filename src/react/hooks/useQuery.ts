import * as React from 'react';
import { RequestState } from '../../core/cache';
import { MultiAbortController } from '../../core/promise';
import { BC, PPC, QPC, RC, SDC } from '../../core/request/types';
import { ClientContext, SsrPromisesManagerContext } from '../Provider';
import { PartialRequestData } from '../../core/request';
import { ensureClient } from './ensureClient';
import { getRequestId } from './getRequestId';
import { useComponentId } from './useComponentId';
import { useSubscription } from './useSubscription';

interface QueryOptions<
    C extends SDC = any,
    R extends RC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any
> {
    getPartialRequestId?(request: PartialRequestData<C, R, P, Q, B>): string | number;
}

export function useQuery<
    C extends SDC = any,
    R extends RC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any
>(request: PartialRequestData<C, R, P, Q, B>, { getPartialRequestId }: QueryOptions = {}) {
    const componentId = useComponentId();

    const client = React.useContext(ClientContext);
    const ssrPromisesManager = React.useContext(SsrPromisesManagerContext);

    ensureClient(client);

    const requestId = getRequestId(request, client, getPartialRequestId);

    const subscription = React.useMemo(
        () => ({
            getCurrentValue: () => client.getState(request, componentId),
            subscribe: (callback: (state: RequestState) => void) => {
                return client.subscribe(request, componentId, callback);
            },
        }),

        [client, requestId, componentId],
    );

    const multiAbortControllerRef = React.useRef<MultiAbortController>();

    if (typeof window === 'undefined') {
        const ssrPromise = client.getSsrPromise(request, componentId);
        ssrPromise && ssrPromisesManager?.addPromise(ssrPromise);
    }

    const query = React.useCallback(
        (forceUpdate?: boolean) => {
            if (!multiAbortControllerRef.current || multiAbortControllerRef.current.signal.aborted) {
                multiAbortControllerRef.current = new MultiAbortController();
            }

            return client.query(request, {
                callerId: componentId,
                forceNetworkRequest: !!forceUpdate,
                multiAbortSignal: multiAbortControllerRef.current.signal,
            });
        },
        [client, requestId, componentId],
    );

    const refetch = React.useCallback(() => {
        return query(true);
    }, [query]);

    const abort = React.useCallback((multi?: boolean) => {
        if (multiAbortControllerRef.current) {
            multiAbortControllerRef.current.abort(multi);
        }
    }, []);

    React.useEffect(() => {
        query();

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
