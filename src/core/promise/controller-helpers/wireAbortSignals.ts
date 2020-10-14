export function wireAbortSignals(callback: () => void, ...signals: (AbortSignal | undefined)[]) {
    signals.forEach(signal => (signal ? wireAbortSignal(signal, callback) : undefined));
}

function wireAbortSignal(signal: AbortSignal, callback: () => void) {
    if (signal.aborted) {
        callback();
    } else {
        signal.addEventListener('abort', callback);
    }
}
