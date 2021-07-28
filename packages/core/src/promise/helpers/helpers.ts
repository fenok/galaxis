export function wait(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function resolveAfter<T>(ms: number, value: T): Promise<T> {
    await wait(ms);
    return value;
}

export function onResolve<U>(promise: Promise<unknown>, cb: () => U | Promise<U>): Promise<U> {
    return promise.then(cb, cb);
}
