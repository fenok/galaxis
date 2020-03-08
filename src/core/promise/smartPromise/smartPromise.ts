import { MultiAbortSignal, RerunSignal } from '../controllers';
import { wireAbortSignals } from '../helpers';
import * as logger from '../../logger';

export interface Signals {
    abortSignal?: AbortSignal | null;
    multiAbortSignal?: MultiAbortSignal | null;
    rerunSignal?: RerunSignal | null;
}

export function smartPromise<T>(
    promiseFactory: (abortSignal?: AbortSignal) => Promise<T>,
    { multiAbortSignal, rerunSignal, abortSignal }: Signals = {},
): Promise<T> {
    return new Promise((resolve, reject) => {
        const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;

        const onAbort = () => {
            if (abortController) {
                abortController.abort();
            } else if (typeof window !== 'undefined') {
                logger.warn('Include AbortController polyfill for network request cancelling.');
            } else {
                logger.warn("Cancelling request on server shouldn't happen.");
            }
        };

        wireAbortSignals(onAbort, multiAbortSignal, abortSignal);

        const onRerun = () => {
            rerunSignal?.removeEventListener('rerun', onRerun);
            onAbort();
            resolve(smartPromise(promiseFactory, { multiAbortSignal, rerunSignal, abortSignal }));
        };

        rerunSignal?.addEventListener('rerun', onRerun);

        promiseFactory(abortController?.signal)
            .then(resolve)
            .catch(reject);
    });
}
