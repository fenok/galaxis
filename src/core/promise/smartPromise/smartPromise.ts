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
                reject(new Error('No AbortController detected'));
                logger.error('Include AbortController polyfill for network request cancelling');
            } else {
                reject(new Error('Unexpected request cancel on server'));
                logger.error("Request can't (and shouldn't) be canceled on server");
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
