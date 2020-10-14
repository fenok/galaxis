import { EnableSignal } from '../controllers';

export interface Signals {
    abortSignal?: AbortSignal;
    enableSignal?: EnableSignal;
}

export function smartPromise<T>(
    promiseFactory: (abortSignal?: AbortSignal) => Promise<T>,
    { abortSignal, enableSignal }: Signals = {},
): Promise<T> {
    return new Promise(resolve => {
        const onEnable = () => {
            enableSignal?.removeEventListener('enable', onEnable);
            resolve(promiseFactory(abortSignal));
        };

        if (enableSignal?.enabled) {
            onEnable();
        } else {
            enableSignal?.addEventListener('enable', onEnable);
        }
    });
}
