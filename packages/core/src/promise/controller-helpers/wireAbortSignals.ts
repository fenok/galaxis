export function wireAbortSignals(callback: () => void, ...signals: (AbortSignal | undefined)[]) {
    signals.forEach((signal) => (signal ? wireAbortSignal(signal, callback) : undefined));
}

function wireAbortSignal(signal: AbortSignal, callback: () => void) {
    // Abort event seems to fire only once, so it's probably redundant. Better safe than sorry, though.
    const wrappedCallback = () => {
        signal.removeEventListener('abort', callback);
        callback();
    };

    if (signal.aborted) {
        wrappedCallback();
    } else {
        signal.addEventListener('abort', wrappedCallback);
    }
}
