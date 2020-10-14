import { useEffect, useState } from 'react';
import { NonUndefined } from '../../core';
import { QueryState } from '../../core/client/QueryProcessor';

interface Options<D extends NonUndefined, E extends Error> {
    getCurrentValue(): QueryState<D, E>;
    subscribe(cb: (state: QueryState<D, E>) => void): () => void;
}

/**
 * https://github.com/facebook/react/tree/master/packages/use-subscription
 */
export function useSubscription<D extends NonUndefined, E extends Error>({
    getCurrentValue,
    subscribe,
}: Options<D, E>) {
    const [state, setState] = useState(() => ({ getCurrentValue, subscribe, value: getCurrentValue() }));

    let valueToReturn = state.value;

    if (state.getCurrentValue !== getCurrentValue || state.subscribe !== subscribe) {
        valueToReturn = { ...getCurrentValue() };

        setState({ getCurrentValue, subscribe, value: valueToReturn });
    }

    useEffect(() => {
        let didUnsubscribe = false;

        const checkForUpdates = () => {
            if (didUnsubscribe) {
                return;
            }

            const value = getCurrentValue();

            setState(prevState => {
                if (prevState.getCurrentValue !== getCurrentValue || prevState.subscribe !== subscribe) {
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
    }, [getCurrentValue, subscribe]);

    return valueToReturn;
}
