import { EnableSignal } from '../controllers';
import { wireAbortSignals } from '../controller-helpers';

export interface Signals {
    abortSignal?: AbortSignal;
    enableSignal?: EnableSignal;
}

export function delayedPromise<T>(
    promiseFactory: (abortSignal?: AbortSignal) => Promise<T>,
    { abortSignal, enableSignal }: Signals = {},
): Promise<T> {
    return new Promise((resolve) => {
        let enabled = false;
        const onEnable = () => {
            if (!enabled) {
                enabled = true;
                enableSignal?.removeEventListener('enable', onEnable);
                resolve(promiseFactory(abortSignal));
            }
        };

        wireAbortSignals(onEnable, abortSignal);

        if (enableSignal?.enabled) {
            onEnable();
        } else {
            enableSignal?.addEventListener('enable', onEnable);
        }
    });
}
