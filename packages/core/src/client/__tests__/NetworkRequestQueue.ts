import { RequestQueue } from '../RequestQueue';
import { resolveAfter, delayedPromise, EnableSignal } from '../../promise';

function getPromiseFactory(value: string, timeout?: number) {
    return (enableSignal: EnableSignal) =>
        delayedPromise(() => (timeout ? resolveAfter(timeout, value) : Promise.resolve(value)), { enableSignal });
}

function getOpts(
    time: 'instant' | 'short' | 'long',
    type: 'query' | 'mutation',
): [(enableSignal: EnableSignal) => Promise<any>, 'query' | 'mutation'] {
    return [getPromiseFactory(`${time}:${type}`, time === 'short' ? 10 : time === 'long' ? 20 : 0), type];
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
