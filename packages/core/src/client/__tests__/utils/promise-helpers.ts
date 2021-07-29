export function wait(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function resolveAfter<T>(ms: number, value: T): Promise<T> {
    await wait(ms);
    return value;
}
