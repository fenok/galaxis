import { wireAbortSignals } from '../controller-helpers';

export interface Signals {
    abortSignal?: AbortSignal;
    abortDelaySignal?: AbortSignal;
}

export function delayedPromise<T>(
    promiseFactory: (abortSignal?: AbortSignal) => Promise<T>,
    { abortSignal, abortDelaySignal }: Signals = {},
): Promise<T> {
    return new Promise((resolve) => {
        let enabled = false;
        const onEnable = () => {
            if (!enabled) {
                enabled = true;
                resolve(promiseFactory(abortSignal));
            }
        };

        wireAbortSignals(onEnable, abortSignal);
        wireAbortSignals(onEnable, abortDelaySignal);

        if (!abortDelaySignal) {
            onEnable();
        }
    });
}
