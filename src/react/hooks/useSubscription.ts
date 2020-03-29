import { useEffect, useState } from 'react';
import { RequestState } from '../../core/cache';
import { RC, EC } from '../../core/request/types';

interface Options<D extends RC, E extends EC> {
    getCurrentValue(mount: boolean, update: boolean): RequestState<D, E>;
    subscribe(cb: (state: RequestState<D, E>) => void): () => void;
}

/**
 * https://github.com/facebook/react/tree/master/packages/use-subscription
 */
export function useSubscription<D extends RC, E extends EC>({ getCurrentValue, subscribe }: Options<D, E>) {
    const [state, setState] = useState(() => ({ getCurrentValue, subscribe, value: getCurrentValue(true, false) }));

    let valueToReturn = state.value;

    if (state.getCurrentValue !== getCurrentValue || state.subscribe !== subscribe) {
        valueToReturn = { ...getCurrentValue(false, true) };

        setState({ getCurrentValue, subscribe, value: valueToReturn });
    }

    useEffect(() => {
        let didUnsubscribe = false;

        const checkForUpdates = () => {
            if (didUnsubscribe) {
                return;
            }

            const value = getCurrentValue(false, false);

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
