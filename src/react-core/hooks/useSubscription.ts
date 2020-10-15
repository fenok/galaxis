import { useEffect, useState } from 'react';
import { NonUndefined, QueryState } from '../../core';

interface Options<D extends NonUndefined, E extends Error> {
    getCurrentQueryState(): QueryState<D, E>;
    subscribe(cb: (state: QueryState<D, E>) => void): () => void;
}

/**
 * https://github.com/facebook/react/tree/master/packages/use-subscription
 */
export function useSubscription<D extends NonUndefined, E extends Error>({
    getCurrentQueryState,
    subscribe,
}: Options<D, E>) {
    const [state, setState] = useState(() => ({ getCurrentQueryState, subscribe, value: getCurrentQueryState() }));

    let valueToReturn = state.value;

    if (state.getCurrentQueryState !== getCurrentQueryState || state.subscribe !== subscribe) {
        valueToReturn = getCurrentQueryState();

        setState({ getCurrentQueryState, subscribe, value: valueToReturn });
    }

    useEffect(() => {
        let didUnsubscribe = false;

        const checkForUpdates = () => {
            if (didUnsubscribe) {
                return;
            }

            const value = getCurrentQueryState();

            setState(prevState => {
                if (prevState.getCurrentQueryState !== getCurrentQueryState || prevState.subscribe !== subscribe) {
                    return prevState;
                }

                if (prevState.value === value) {
                    return prevState;
                }

                if (
                    prevState.value.loading === value.loading &&
                    prevState.value.error === value.error &&
                    prevState.value.data === value.data
                ) {
                    return prevState;
                }

                return { ...prevState, value };
            });
        };
        const unsubscribe = subscribe(checkForUpdates);

        checkForUpdates();

        return () => {
            didUnsubscribe = true;
            unsubscribe();
        };
    }, [getCurrentQueryState, subscribe]);

    return valueToReturn;
}
