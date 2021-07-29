import {
    FIRST_ITEM,
    FIRST_ITEM_RESOURCE,
    fromCache,
    getAbortError,
    getQueryProcessor,
    request,
    toCache,
} from './utils/request-helpers';

it('can query data', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const queryResult = queryProcessor.query(firstItemQuery);

    const networkResponse = await queryResult[1];

    const dataFromCache = queryProcessor.readQuery(firstItemQuery);

    expect(networkResponse).toEqual(FIRST_ITEM);
    expect(dataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('respects fetch policies', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    let cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemQuery,
        fetchPolicy: 'cache-only',
    });
    expect(cacheOnlyQueryResult[0]).toMatchObject({ data: undefined, error: undefined });

    let cacheFirstQueryResult = queryProcessor.query({
        ...firstItemQuery,
        fetchPolicy: 'cache-first',
    });
    expect(cacheFirstQueryResult[0]).toMatchObject({ data: undefined, error: undefined });

    let cacheAndNetworkQueryResult = queryProcessor.query({
        ...firstItemQuery,
        fetchPolicy: 'cache-and-network',
    });
    expect(cacheAndNetworkQueryResult[0]).toMatchObject({ data: undefined, error: undefined });

    expect(cacheOnlyQueryResult[1]).toEqual(undefined);
    await expect(cacheFirstQueryResult[1]).resolves.toEqual(FIRST_ITEM);
    await expect(cacheAndNetworkQueryResult[1]).resolves.toEqual(FIRST_ITEM);

    cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemQuery,
        fetchPolicy: 'cache-only',
    });
    expect(cacheOnlyQueryResult[0]).toMatchObject({ data: FIRST_ITEM, error: undefined });

    cacheFirstQueryResult = queryProcessor.query({
        ...firstItemQuery,
        fetchPolicy: 'cache-first',
    });
    expect(cacheFirstQueryResult[0]).toMatchObject({ data: FIRST_ITEM, error: undefined });

    cacheAndNetworkQueryResult = queryProcessor.query({
        ...firstItemQuery,
        fetchPolicy: 'cache-and-network',
    });
    expect(cacheAndNetworkQueryResult[0]).toMatchObject({ data: FIRST_ITEM, error: undefined });

    expect(cacheOnlyQueryResult[1]).toEqual(undefined);
    expect(cacheFirstQueryResult[1]).toEqual(undefined);
    await expect(cacheAndNetworkQueryResult[1]).resolves.toEqual({ ...FIRST_ITEM, freshness: 2 });

    const dataFromCache = queryProcessor.readQuery({ ...firstItemQuery });

    expect(dataFromCache).toMatchObject({ data: { ...FIRST_ITEM, freshness: 2 }, error: undefined });
});

it('can reuse network requests', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const firstQueryResult = queryProcessor.query(firstItemQuery);

    expect(queryProcessor.readQuery(firstItemQuery)).toMatchObject({
        data: undefined,
        error: undefined,
    });

    const secondQueryResult = queryProcessor.query(firstItemQuery);

    expect(queryProcessor.readQuery(firstItemQuery)).toMatchObject({
        data: undefined,
        error: undefined,
    });

    expect(firstQueryResult[1]).toBeDefined();
    expect(secondQueryResult[1]).toBeDefined();

    const networkResponse = await Promise.all([firstQueryResult[1], secondQueryResult[1]]);

    const firstDataFromCache = queryProcessor.readQuery(firstItemQuery);
    const secondDataFromCache = queryProcessor.readQuery(firstItemQuery);

    expect(networkResponse[0]).toEqual(FIRST_ITEM);
    expect(networkResponse[1]).toBe(networkResponse[0]);
    expect(firstDataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
    expect(secondDataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('can abort network request', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const abortController = new AbortController();

    const queryResult = queryProcessor.query({ ...firstItemQuery, abortSignal: abortController.signal });

    abortController.abort();

    await expect(queryResult[1]).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.readQuery(firstItemQuery);

    expect(dataFromCache).toMatchObject({ data: undefined, error: getAbortError() });
});

it('can abort network request for multiple requesters', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const firstAbortController = new AbortController();
    const secondAbortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemQuery,
        abortSignal: firstAbortController.signal,
    });

    const secondQueryResult = queryProcessor.query({
        ...firstItemQuery,
        abortSignal: secondAbortController.signal,
    });

    firstAbortController.abort();
    secondAbortController.abort();

    await expect(firstQueryResult[1]).rejects.toEqual(getAbortError());
    await expect(secondQueryResult[1]).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.readQuery({
        ...firstItemQuery,
        abortSignal: firstAbortController.signal,
    });

    expect(dataFromCache).toMatchObject({ data: undefined, error: getAbortError() });
});

it('does not abort network request if not all requesters asked so', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const abortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemQuery,
        softAbortSignal: abortController.signal,
    });

    const secondQueryResult = queryProcessor.query(firstItemQuery);

    abortController.abort();

    await expect(firstQueryResult[1]).resolves.toEqual(FIRST_ITEM);
    await expect(secondQueryResult[1]).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.readQuery(firstItemQuery);

    expect(dataFromCache).toMatchObject({ data: FIRST_ITEM, error: undefined });
});

it('correctly aborts previous request when the next one is executed immediately with the same id', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const abortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemQuery,
        abortSignal: abortController.signal,
    });

    abortController.abort();

    const secondQueryResult = queryProcessor.query(firstItemQuery);

    await expect(firstQueryResult[1]).rejects.toEqual(getAbortError());
    await expect(secondQueryResult[1]).resolves.toEqual({ ...FIRST_ITEM, freshness: 2 });

    const dataFromCache = queryProcessor.readQuery(firstItemQuery);

    expect(dataFromCache).toMatchObject({ data: { ...FIRST_ITEM, freshness: 2 }, error: undefined });
});

it('reruns all requests on reset', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemQuery = {
        resource: FIRST_ITEM_RESOURCE,
        request: request(),
        toCache,
        fromCache,
    };

    const queryResult = queryProcessor.query(firstItemQuery);

    queryProcessor.onReset();

    await expect(queryResult[1]).resolves.toMatchObject({ ...FIRST_ITEM, freshness: 2 });

    const dataFromCacheAfterReset = queryProcessor.readQuery(firstItemQuery);

    expect(dataFromCacheAfterReset).toMatchObject({ data: { ...FIRST_ITEM, freshness: 2 }, error: undefined });
});
