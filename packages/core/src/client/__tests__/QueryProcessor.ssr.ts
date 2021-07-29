/**
 * @jest-environment node
 */

import {
    getQueryProcessor,
    getNetworkError,
    toCache,
    fromCache,
    FIRST_ITEM_RESOURCE,
    request,
    FIRST_ITEM,
} from './utils/request-helpers';

it('does not return promise if there is error in cache', async () => {
    const queryProcessor = getQueryProcessor();

    const failingQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: () => Promise.reject(getNetworkError()),
        toCache,
        fromCache,
    };

    const [, promise] = queryProcessor.query(failingQuery);

    await expect(promise).rejects.toEqual(getNetworkError());

    const dataFromCache = queryProcessor.readQuery(failingQuery);
    expect(dataFromCache).toMatchObject({ data: undefined, error: getNetworkError() });

    const [, nextPromise] = queryProcessor.query(failingQuery);

    const postQueryDataFromCache = queryProcessor.readQuery(failingQuery);
    expect(postQueryDataFromCache).toMatchObject({ data: undefined, error: getNetworkError() });

    expect(nextPromise).toEqual(undefined);

    const nextDataFromCache = queryProcessor.readQuery(failingQuery);

    expect(nextDataFromCache).toMatchObject({ data: undefined, error: getNetworkError() });
});

it('does not return promise if there is data in cache', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const [, promise] = queryProcessor.query(firstItemQuery);

    await expect(promise).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.readQuery(firstItemQuery);

    expect(dataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });

    const [, nextRequest] = queryProcessor.query(firstItemQuery);

    expect(nextRequest).toEqual(undefined);

    const nextDataFromCache = queryProcessor.readQuery(firstItemQuery);

    expect(nextDataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('can opt-out from returning the promise', () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const [, promise] = queryProcessor.query({ ...firstItemQuery, disableSsr: true });
    expect(promise).toEqual(undefined);

    const dataFromCache = queryProcessor.readQuery(firstItemQuery);
    expect(dataFromCache).toMatchObject({ data: undefined, error: undefined });
});
