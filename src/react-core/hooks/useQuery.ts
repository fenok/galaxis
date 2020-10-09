import * as React from 'react';
import { MultiAbortController } from '../../core/promise';
import { SsrPromisesManagerContext, useClient } from '../Provider';
import { NonUndefined, YarfRequest } from '../../core/request';
import { ensureClient } from './ensureClient';
import { getRequestHash } from './getRequestHash';
import { useId } from './useId';
import { useSubscription } from './useSubscription';
import { usePrevious } from './usePrevious';
import { RequestState } from '../../core/client/Client';

interface QueryOptions<C extends NonUndefined, R extends NonUndefined, E extends Error, I> {
    requesterId?: string;
    getRequestHash?(request: YarfRequest<C, R, E, I>): string | number;
}

export function useQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    request: YarfRequest<C, R, E, I>,
    { getRequestHash: getRequestHashOuter, requesterId: outerRequesterId }: QueryOptions<C, R, E, I> = {},
) {
    const requesterId = useId(outerRequesterId);

    const client = useClient<C>();
    const ssrPromisesManager = React.useContext(SsrPromisesManagerContext);

    ensureClient(client);

    const requestHash = getRequestHash(request, getRequestHashOuter);

    const multiAbortControllerRef = React.useRef<MultiAbortController>();

    const getRequestOptions = React.useCallback(
        (
            ssr: boolean,
            respectLazy: boolean,
            forceNetworkRequest: boolean,
            disableNetworkRequestOptimization: boolean,
        ) => {
            if (!multiAbortControllerRef.current || multiAbortControllerRef.current.signal.aborted) {
                multiAbortControllerRef.current = new MultiAbortController();
            }

            return {
                requesterId,
                forceNetworkRequest,
                disableNetworkRequestOptimization,
                respectLazy,
                ssr,
                multiAbortSignal: multiAbortControllerRef.current.signal,
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const refetch = React.useCallback(
        (disableNetworkRequestOptimization?: boolean) => {
            return client.query(
                request,
                getRequestOptions(false, false, true, Boolean(disableNetworkRequestOptimization)),
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [client, requestHash],
    );

    const abort = React.useCallback((multi?: boolean) => {
        if (multiAbortControllerRef.current) {
            multiAbortControllerRef.current.abort(multi);
        }
    }, []);

    const prevClient = usePrevious(client);
    const prevRequestId = usePrevious(requestHash);

    if (prevClient !== client || prevRequestId !== requestHash) {
        abort();
        const queryPromise = client
            .query(request, getRequestOptions(typeof window === 'undefined', true, false, false))
            .fromNetwork?.catch(() => {
                // Prevent uncaught error message (error will be in state)
            });

        if (typeof window === 'undefined' && ssrPromisesManager && queryPromise) {
            ssrPromisesManager.addPromise(queryPromise);
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
        [client, requestHash],
    );

    const requestState = useSubscription(subscription);

    return { ...requestState, requesterId: requesterId, refetch, abort };
}
