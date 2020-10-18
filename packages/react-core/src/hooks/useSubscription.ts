import { useEffect, useState } from 'react';
import { NonUndefined, QueryCache } from '@fetcher/core';

interface Subscription<D extends NonUndefined, E extends Error> {
    getCurrentQueryCache(): QueryCache<D, E> | undefined;
    subscribe(cb: (queryCache?: QueryCache<D, E>) => void): () => void;
}

interface SubscriptionOptions {
    disableSubscription: boolean;
}

/**
 * https://github.com/facebook/react/tree/master/packages/use-subscription
 */
export function useSubscription<D extends NonUndefined, E extends Error>(
    { getCurrentQueryCache, subscribe }: Subscription<D, E>,
    { disableSubscription }: SubscriptionOptions,
) {
    const [state, setState] = useState(() => ({
        getCurrentQueryCache,
        subscribe,
        queryState: getCurrentQueryCache(),
    }));

    let valueToReturn = state.queryState;

    if (state.getCurrentQueryCache !== getCurrentQueryCache || state.subscribe !== subscribe) {
        valueToReturn = getCurrentQueryCache();

        setState({ getCurrentQueryCache, subscribe, queryState: valueToReturn });
    }

    useEffect(() => {
        let didUnsubscribe = false;

        const checkForUpdates = () => {
            if (didUnsubscribe) {
                return;
            }

            const queryState = getCurrentQueryCache();

            setState((prevState) => {
                if (prevState.getCurrentQueryCache !== getCurrentQueryCache || prevState.subscribe !== subscribe) {
                    return prevState;
                }

                if (prevState.queryState === queryState) {
                    return prevState;
                }

                if (
                    prevState.queryState?.error === queryState?.error &&
                    prevState.queryState?.data === queryState?.data
                ) {
                    return prevState;
                }

                return { ...prevState, queryState };
            });
        };
        let unsubscribe: Function;

        if (!disableSubscription) {
            unsubscribe = subscribe(checkForUpdates);

            checkForUpdates();
        }

        return () => {
            didUnsubscribe = true;
            unsubscribe?.();
        };
    }, [disableSubscription, getCurrentQueryCache, subscribe]);

    return valueToReturn;
}
