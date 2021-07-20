import {
    getQueryProcessor,
    getFirstItemRequest,
    FIRST_ITEM,
    getAbortError,
    getSecondItemRequest,
    SECOND_ITEM,
} from './utils/request-helpers';

it('can query data', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest);

    const networkResponse = await queryResult[1];

    const dataFromCache = queryProcessor.readQuery(firstItemRequest);

    expect(networkResponse).toEqual(FIRST_ITEM);
    expect(dataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('respects fetch policies', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    let cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
    });
    expect(cacheOnlyQueryResult[0]).toMatchObject({ data: undefined, error: undefined });

    let cacheFirstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-first',
    });
    expect(cacheFirstQueryResult[0]).toMatchObject({ data: undefined, error: undefined });

    let cacheAndNetworkQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-and-network',
    });
    expect(cacheAndNetworkQueryResult[0]).toMatchObject({ data: undefined, error: undefined });

    expect(cacheOnlyQueryResult[1]).toEqual(undefined);
    await expect(cacheFirstQueryResult[1]).resolves.toEqual(FIRST_ITEM);
    await expect(cacheAndNetworkQueryResult[1]).resolves.toEqual(FIRST_ITEM);

    cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
    });
    expect(cacheOnlyQueryResult[0]).toMatchObject({ data: FIRST_ITEM, error: undefined });

    cacheFirstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-first',
    });
    expect(cacheFirstQueryResult[0]).toMatchObject({ data: FIRST_ITEM, error: undefined });

    cacheAndNetworkQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-and-network',
    });
    expect(cacheAndNetworkQueryResult[0]).toMatchObject({ data: FIRST_ITEM, error: undefined });

    expect(cacheOnlyQueryResult[1]).toEqual(undefined);
    expect(cacheFirstQueryResult[1]).toEqual(undefined);
    await expect(cacheAndNetworkQueryResult[1]).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.readQuery({ ...firstItemRequest });

    expect(dataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('can reuse network requests', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstQueryResult = queryProcessor.query({ ...firstItemRequest });

    expect(queryProcessor.readQuery({ ...firstItemRequest })).toMatchObject({
        data: undefined,
        error: undefined,
    });

    const secondQueryResult = queryProcessor.query({ ...firstItemRequest });

    expect(queryProcessor.readQuery({ ...firstItemRequest })).toMatchObject({
        data: undefined,
        error: undefined,
    });

    expect(firstQueryResult[1]).toBeDefined();
    expect(secondQueryResult[1]).toBeDefined();

    const networkResponse = await Promise.all([firstQueryResult[1], secondQueryResult[1]]);

    const firstDataFromCache = queryProcessor.readQuery({ ...firstItemRequest });
    const secondDataFromCache = queryProcessor.readQuery({ ...firstItemRequest });

    expect(networkResponse[0]).toEqual(FIRST_ITEM);
    expect(networkResponse[1]).toBe(networkResponse[0]);
    expect(firstDataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
    expect(secondDataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('can abort network request', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new AbortController();

    const queryResult = queryProcessor.query({ ...firstItemRequest, abortSignal: abortController.signal });

    abortController.abort();

    await expect(queryResult[1]).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.readQuery(firstItemRequest);

    expect(dataFromCache).toMatchObject({ data: undefined, error: getAbortError() });
});

it('can abort network request for multiple requesters', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstAbortController = new AbortController();
    const secondAbortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        abortSignal: firstAbortController.signal,
    });

    const secondQueryResult = queryProcessor.query({
        ...firstItemRequest,
        abortSignal: secondAbortController.signal,
    });

    firstAbortController.abort();
    secondAbortController.abort();

    await expect(firstQueryResult[1]).rejects.toEqual(getAbortError());
    await expect(secondQueryResult[1]).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.readQuery({
        ...firstItemRequest,
        abortSignal: firstAbortController.signal,
    });

    expect(dataFromCache).toMatchObject({ data: undefined, error: getAbortError() });
});

it('does not abort network request if not all requesters asked so', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        softAbortSignal: abortController.signal,
    });

    const secondQueryResult = queryProcessor.query({ ...firstItemRequest });

    abortController.abort();

    await expect(firstQueryResult[1]).resolves.toEqual(FIRST_ITEM);
    await expect(secondQueryResult[1]).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.readQuery(firstItemRequest);

    expect(dataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('correctly aborts previous request when the next one is executed immediately with the same id', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();
    const secondItemRequest = getSecondItemRequest();

    const abortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        getRequestId: () => 'one-and-only',
        abortSignal: abortController.signal,
    });

    abortController.abort();

    const secondQueryResult = queryProcessor.query({ ...secondItemRequest, getRequestId: () => 'one-and-only' });

    await expect(firstQueryResult[1]).rejects.toEqual(getAbortError());
    await expect(secondQueryResult[1]).resolves.toEqual(SECOND_ITEM);

    const dataFromCache = queryProcessor.readQuery({
        ...secondItemRequest,
        getRequestId: () => 'one-and-only',
    });

    expect(dataFromCache).toMatchObject({ data: SECOND_ITEM, error: undefined });
});

it('on purge all requests are aborted and do not affect cache anymore', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest);

    queryProcessor.onReset();

    await expect(queryResult[1]).rejects.toEqual(getAbortError());

    const dataFromCacheAfterPurge = queryProcessor.readQuery(firstItemRequest);

    expect(dataFromCacheAfterPurge).toMatchObject({ data: undefined, error: undefined });
});

it('resets persisted loading state if there is no network request', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest);

    queryProcessor.onReset();

    await expect(queryResult[1]).rejects.toEqual(getAbortError());

    const loadingDataFromCache = queryProcessor.readQuery(firstItemRequest);
    expect(loadingDataFromCache).toMatchObject({ data: undefined, error: undefined });

    const cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
    });

    expect(cacheOnlyQueryResult[1]).toEqual(undefined);
    expect(cacheOnlyQueryResult).toMatchObject({ data: undefined, error: undefined });

    const dataFromCache = queryProcessor.readQuery({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
    });
    expect(dataFromCache).toMatchObject({ data: undefined, error: undefined });
});
