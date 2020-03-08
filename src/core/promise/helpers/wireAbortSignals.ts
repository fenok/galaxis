import { MultiAbortSignal } from '../controllers';

export function wireAbortSignals(
    callback: (multi?: boolean) => void,
    ...signals: (AbortSignal | MultiAbortSignal | undefined | null)[]
) {
    signals.forEach(signal => signal && wireAbortSignal(signal, callback));
}

function wireAbortSignal(signal: AbortSignal | MultiAbortSignal, callback: (multi?: boolean) => void) {
    const callbackInner = (eventOrFlag?: Event | boolean) => {
        if (typeof eventOrFlag === 'boolean') {
            callback(eventOrFlag);
        } else {
            callback();
        }
    };

    if (signal.aborted) {
        callbackInner((signal as MultiAbortSignal).multi);
    }
    signal.addEventListener('abort', callbackInner);
}
