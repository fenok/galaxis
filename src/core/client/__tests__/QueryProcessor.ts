import {
    getQueryProcessor,
    getFirstItemRequest,
    FIRST_ITEM,
    getAbortError,
    getSecondItemRequest,
    SECOND_ITEM,
    getFirstItemRequestWithOptimisticResponse,
    OPTIMISTIC_FIRST_ITEM,
} from '../../test-utils/request-helpers';
import { MultiAbortController } from '../../promise/controllers';

it('can query data', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest);

    const networkResponse = await queryResult.fromNetwork;

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(networkResponse).toEqual(FIRST_ITEM);
    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('respects fetch policies', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    let cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
        requesterId: 'test1',
    });
    expect(cacheOnlyQueryResult.fromCache).toEqual({ data: undefined, loading: [], error: undefined });

    let cacheFirstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-first',
        requesterId: 'test2',
    });
    // No loading state, because fromCache shows cache state before query execution
    expect(cacheFirstQueryResult.fromCache).toEqual({ data: undefined, loading: [], error: undefined });

    let cacheAndNetworkQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-and-network',
        requesterId: 'test3',
    });
    expect(cacheAndNetworkQueryResult.fromCache).toEqual({ data: undefined, loading: ['test2'], error: undefined });

    expect(cacheOnlyQueryResult.fromNetwork).toEqual(undefined);
    await expect(cacheFirstQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);
    await expect(cacheAndNetworkQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
        requesterId: 'test1',
    });
    expect(cacheOnlyQueryResult.fromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    cacheFirstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-first',
        requesterId: 'test2',
    });
    expect(cacheFirstQueryResult.fromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    cacheAndNetworkQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-and-network',
        requesterId: 'test3',
    });
    expect(cacheAndNetworkQueryResult.fromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    expect(cacheOnlyQueryResult.fromNetwork).toEqual(undefined);
    expect(cacheFirstQueryResult.fromNetwork).toEqual(undefined);
    await expect(cacheAndNetworkQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test1' });

    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('can opt-in to performing network request regardless of cache state and fetch policy', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest);

    const networkResponse = await queryResult.fromNetwork;

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(networkResponse).toEqual(FIRST_ITEM);
    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    const cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
        forceNetworkRequest: true,
    });

    await expect(cacheOnlyQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);
});

it('can reuse network requests', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstQueryResult = queryProcessor.query({ ...firstItemRequest, requesterId: 'test1' });

    expect(queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test1' })).toEqual({
        data: undefined,
        loading: ['test1'],
        error: undefined,
    });

    const secondQueryResult = queryProcessor.query({ ...firstItemRequest, requesterId: 'test2' });

    expect(queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test2' })).toEqual({
        data: undefined,
        loading: ['test1', 'test2'],
        error: undefined,
    });

    expect(firstQueryResult.fromNetwork).toBeDefined();
    expect(secondQueryResult.fromNetwork).toBeDefined();

    const networkResponse = await Promise.all([firstQueryResult.fromNetwork, secondQueryResult.fromNetwork]);

    const firstDataFromCache = queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test1' });
    const secondDataFromCache = queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test2' });

    expect(networkResponse[0]).toEqual(FIRST_ITEM);
    expect(networkResponse[1]).toBe(networkResponse[0]);
    expect(firstDataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
    expect(secondDataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('can opt-out from network request reuse', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstQueryResult = queryProcessor.query({ ...firstItemRequest, requesterId: 'test1' });

    expect(queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test1' })).toEqual({
        data: undefined,
        loading: ['test1'],
        error: undefined,
    });

    const secondQueryResult = queryProcessor.query({
        ...firstItemRequest,
        requesterId: 'test2',
        rerunExistingNetworkRequest: true,
    });

    expect(
        queryProcessor.getCompleteRequestState({
            ...firstItemRequest,
            requesterId: 'test2',
            rerunExistingNetworkRequest: true,
        }),
    ).toEqual({
        data: undefined,
        loading: ['test1', 'test2'],
        error: undefined,
    });

    expect(firstQueryResult.fromNetwork).toBeDefined();
    expect(secondQueryResult.fromNetwork).toBeDefined();

    const networkResponse = await Promise.all([firstQueryResult.fromNetwork, secondQueryResult.fromNetwork]);

    const firstDataFromCache = queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test1' });
    const secondDataFromCache = queryProcessor.getCompleteRequestState({ ...firstItemRequest, requesterId: 'test2' });

    expect(networkResponse[0]).toEqual({ ...FIRST_ITEM, freshness: 2 });
    expect(networkResponse[1]).toBe(networkResponse[0]);
    expect(firstDataFromCache).toEqual({ data: { ...FIRST_ITEM, freshness: 2 }, loading: [], error: undefined });
    expect(secondDataFromCache).toEqual({ data: { ...FIRST_ITEM, freshness: 2 }, loading: [], error: undefined });
});

it('can abort network request', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new AbortController();

    const queryResult = queryProcessor.query({ ...firstItemRequest, abortSignal: abortController.signal });

    abortController.abort();

    await expect(queryResult.fromNetwork).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: getAbortError() });
});

it('can abort network request for multiple requesters', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstAbortController = new AbortController();
    const secondAbortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        requesterId: 'test1',
        abortSignal: firstAbortController.signal,
    });

    const secondQueryResult = queryProcessor.query({
        ...firstItemRequest,
        requesterId: 'test2',
        abortSignal: secondAbortController.signal,
    });

    expect(
        queryProcessor.getCompleteRequestState({
            ...firstItemRequest,
            requesterId: 'test1',
            abortSignal: firstAbortController.signal,
        }).loading,
    ).toEqual(['test1', 'test2']);

    firstAbortController.abort();
    secondAbortController.abort();

    await expect(firstQueryResult.fromNetwork).rejects.toEqual(getAbortError());
    await expect(secondQueryResult.fromNetwork).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.getCompleteRequestState({
        ...firstItemRequest,
        requesterId: 'test1',
        abortSignal: firstAbortController.signal,
    });

    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: getAbortError() });
});

it('does not abort network request if not all requesters asked so', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new AbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        requesterId: 'test1',
        abortSignal: abortController.signal,
    });

    const secondQueryResult = queryProcessor.query({ ...firstItemRequest, requesterId: 'test2' });

    expect(
        queryProcessor.getCompleteRequestState({
            ...firstItemRequest,
            requesterId: 'test1',
            abortSignal: abortController.signal,
        }).loading,
    ).toEqual(['test1', 'test2']);

    abortController.abort();

    expect(
        queryProcessor.getCompleteRequestState({
            ...firstItemRequest,
            requesterId: 'test1',
            abortSignal: abortController.signal,
        }).loading,
    ).toEqual(['test2']);

    await expect(firstQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);
    await expect(secondQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('one requester can explicitly ask to abort network request for multiple requesters', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new MultiAbortController();

    const firstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        requesterId: 'test1',
        abortSignal: abortController.signal,
    });

    const secondQueryResult = queryProcessor.query({ ...firstItemRequest, requesterId: 'test2' });

    expect(
        queryProcessor.getCompleteRequestState({
            ...firstItemRequest,
            requesterId: 'test1',
            abortSignal: abortController.signal,
        }).loading,
    ).toEqual(['test1', 'test2']);

    abortController.abort(true);

    await expect(firstQueryResult.fromNetwork).rejects.toEqual(getAbortError());
    await expect(secondQueryResult.fromNetwork).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: getAbortError() });
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

    await expect(firstQueryResult.fromNetwork).rejects.toEqual(getAbortError());
    await expect(secondQueryResult.fromNetwork).resolves.toEqual(SECOND_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState({
        ...secondItemRequest,
        getRequestId: () => 'one-and-only',
    });

    expect(dataFromCache).toEqual({ data: SECOND_ITEM, loading: [], error: undefined });
});

it('on purge all requests are aborted and do not affect cache anymore', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest);

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(dataFromCache.loading).toEqual(['test']);

    queryProcessor.purge();

    await expect(queryResult.fromNetwork).rejects.toEqual(getAbortError());

    const dataFromCacheAfterPurge = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(dataFromCacheAfterPurge).toEqual({ data: undefined, loading: ['test'], error: undefined });
});

it('supports optimistic responses', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequestWithOptimisticResponse();

    const queryResult = queryProcessor.query(firstItemRequest);

    expect(queryResult.fromCache).toEqual({ data: undefined, loading: [], error: undefined });

    const optimisticDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(optimisticDataFromCache).toEqual({ data: OPTIMISTIC_FIRST_ITEM, loading: ['test'], error: undefined });

    await expect(queryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);

    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('does not consider persisted optimistic data / resets persisted loading state', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequestWithOptimisticResponse();

    const queryResult = queryProcessor.query(firstItemRequest);

    expect(queryResult.fromCache).toEqual({ data: undefined, loading: [], error: undefined });

    queryProcessor.purge();

    await expect(queryResult.fromNetwork).rejects.toEqual(getAbortError());

    const optimisticDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);
    expect(optimisticDataFromCache).toEqual({ data: OPTIMISTIC_FIRST_ITEM, loading: ['test'], error: undefined });

    const cacheFirstQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-first',
        requesterId: 'test2',
    });

    const loadingDataFromCache = queryProcessor.getCompleteRequestState({
        ...firstItemRequest,
        fetchPolicy: 'cache-first',
        requesterId: 'test2',
    });
    expect(loadingDataFromCache).toEqual({ data: OPTIMISTIC_FIRST_ITEM, loading: ['test2'], error: undefined });

    await expect(cacheFirstQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState({
        ...firstItemRequest,
        fetchPolicy: 'cache-first',
        requesterId: 'test2',
    });
    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('resets persisted loading state if there is no network request', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest);

    queryProcessor.purge();

    await expect(queryResult.fromNetwork).rejects.toEqual(getAbortError());

    const loadingDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest);
    expect(loadingDataFromCache).toEqual({ data: undefined, loading: ['test'], error: undefined });

    const cacheOnlyQueryResult = queryProcessor.query({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
        requesterId: 'test2',
    });

    expect(cacheOnlyQueryResult.fromNetwork).toEqual(undefined);
    expect(cacheOnlyQueryResult.fromCache).toEqual({ data: undefined, loading: ['test'], error: undefined });

    const dataFromCache = queryProcessor.getCompleteRequestState({
        ...firstItemRequest,
        fetchPolicy: 'cache-only',
        requesterId: 'test2',
    });
    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: undefined });
});
