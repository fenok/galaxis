export function wait(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function resolveAfter<T>(ms: number, value: T): Promise<T> {
    await wait(ms);
    return value;
}

export function onResolve<U>(promise: Promise<any>, cb: () => U | Promise<U>): Promise<U> {
    return promise.then(cb, cb);
}

export function allSettled(promises: Promise<any>[]) {
    return new Promise((resolve) => {
        let unsettledCount = promises.length;

        if (!unsettledCount) {
            resolve();
        }

        const onSettle = () => {
            if (--unsettledCount <= 0) {
                resolve();
            }
        };

        promises.forEach((promise) => {
            promise.then(onSettle, onSettle);
        });
    });
}
