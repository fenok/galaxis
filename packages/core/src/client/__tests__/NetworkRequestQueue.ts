import { RequestQueue } from '../RequestQueue';
import { resolveAfter, delayedPromise, EnableSignal, wireAbortSignals } from '../../promise';

function getPromiseFactory(value: string, timeout?: number, abortSignal?: AbortSignal) {
    return (enableSignal: EnableSignal) =>
        delayedPromise(
            (abortSignal) => {
                return new Promise((resolve, reject) => {
                    wireAbortSignals(() => reject(value + ':abort'), abortSignal);
                    if (timeout) {
                        void resolveAfter(timeout, value).then(resolve);
                    } else {
                        resolve(value);
                    }
                });
            },
            {
                enableSignal,
                abortSignal,
            },
        );
}

function getOpts(
    time: 'instant' | 'short' | 'long',
    type: 'query' | 'mutation',
    abortSignal?: AbortSignal,
): [(enableSignal: EnableSignal) => Promise<any>, 'query' | 'mutation'] {
    return [getPromiseFactory(`${time}:${type}`, time === 'short' ? 10 : time === 'long' ? 20 : 0, abortSignal), type];
}

it('processes queries independently and mutations sequentially', async () => {
    const values: string[] = [];
    function updateValues(nextValue: string) {
        values.push(nextValue);
    }

    const queue = new RequestQueue();
    await Promise.all([
        queue.addPromise(...getOpts('short', 'query')).then(updateValues),
        queue.addPromise(...getOpts('long', 'query')).then(updateValues),
        queue.addPromise(...getOpts('instant', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('short', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('long', 'query')).then(updateValues),
        queue.addPromise(...getOpts('short', 'query')).then(updateValues),
        queue.addPromise(...getOpts('short', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('instant', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('long', 'query')).then(updateValues),
        queue.addPromise(...getOpts('instant', 'query')).then(updateValues),
    ]);

    expect(values).toEqual([
        'short:query',
        'long:query',
        'instant:mutation',
        'short:mutation',
        'short:query',
        'long:query',
        'short:mutation',
        'instant:mutation',
        'instant:query',
        'long:query',
    ]);
});

it('allows promises to reject early', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const values: string[] = [];
    function updateValues(nextValue: string) {
        values.push(nextValue);
    }

    const queue = new RequestQueue();
    await Promise.all([
        queue.addPromise(...getOpts('long', 'query')).then(updateValues),
        queue.addPromise(...getOpts('short', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('short', 'query', abortController.signal)).catch(updateValues),
    ]);

    expect(values).toEqual(['short:query:abort', 'long:query', 'short:mutation']);
});

it('maintains order of fulfilled promises even with rejected promises', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const values: string[] = [];
    function updateValues(nextValue: string) {
        values.push(nextValue);
    }

    const queue = new RequestQueue();
    await Promise.all([
        queue.addPromise(...getOpts('long', 'query')).then(updateValues),
        queue.addPromise(...getOpts('long', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('short', 'query', abortController.signal)).catch(updateValues),
        queue.addPromise(...getOpts('short', 'query')).then(updateValues),
        queue.addPromise(...getOpts('short', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('short', 'query', abortController.signal)).catch(updateValues),
        queue.addPromise(...getOpts('short', 'mutation')).then(updateValues),
        queue.addPromise(...getOpts('short', 'query', abortController.signal)).catch(updateValues),
    ]);

    expect(values).toEqual([
        'short:query:abort',
        'short:query:abort',
        'short:query:abort',
        'long:query',
        'long:mutation',
        'short:query',
        'short:mutation',
        'short:mutation',
    ]);
});
