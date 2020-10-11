import { TestCache } from '../../test-utils/TestCache';
import { YarfRequest } from '../../types';
import { QueryProcessor } from '../QueryProcessor';
import { NetworkRequestQueue } from '../NetworkRequestQueue';
import { wait } from '../../promise/helpers';
import { MultiAbortController } from '../../promise/controllers';

interface ItemEntity {
    id: string;
    value: string;
    freshness: number;
}

const FIRST_ITEM: ItemEntity = {
    id: '1',
    value: 'first',
    freshness: 1,
};

const SECOND_ITEM: ItemEntity = {
    id: '2',
    value: 'second',
    freshness: 1,
};

interface TestRequestInit {
    id: '1' | '2';
}

function getAbortError() {
    return new DOMException('Failed to fetch', 'AbortError');
}

function getNetworkRequestFactory(requestInit: TestRequestInit) {
    let freshness = 0;

    return (abortSignal?: AbortSignal) => {
        freshness++;

        return new Promise<ItemEntity>((resolve, reject) => {
            function onAbort() {
                reject(getAbortError());
            }

            if (abortSignal?.aborted) {
                onAbort();
            } else {
                abortSignal?.addEventListener('abort', onAbort);
            }

            wait(200).then(() => {
                resolve(requestInit.id === '1' ? { ...FIRST_ITEM, freshness } : { ...SECOND_ITEM, freshness });
            });
        });
    };
}

interface TestCacheData {
    items: Record<string, ItemEntity>;
}

const INITIAL_CACHE_DATA: TestCacheData = {
    items: {},
};

const BASE_REQUEST: Pick<YarfRequest<TestCacheData>, 'fetchPolicy' | 'getId'> = {
    fetchPolicy: 'cache-and-network',
    getId(requestInit: unknown): string {
        return Buffer.from(JSON.stringify(requestInit)).toString('base64');
    },
};

const ITEM_REQUEST: Omit<
    YarfRequest<TestCacheData, ItemEntity, Error, TestRequestInit>,
    'requestInit' | 'getNetworkRequestFactory'
> = {
    ...BASE_REQUEST,
    toCache({ cacheData, data }) {
        return { ...cacheData, items: { ...cacheData.items, [data.id]: data } };
    },
    fromCache({ cacheData, requestInit }) {
        return cacheData.items[requestInit.id];
    },
};

function getFirstItemRequest(): YarfRequest<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getNetworkRequestFactory,
        requestInit: { id: '1' },
    };
}

function getSecondItemRequest(): YarfRequest<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getNetworkRequestFactory,
        requestInit: { id: '2' },
    };
}

function getQueryProcessor() {
    return new QueryProcessor({
        cache: new TestCache({ initialData: INITIAL_CACHE_DATA, emptyData: INITIAL_CACHE_DATA }),
        networkRequestQueue: new NetworkRequestQueue(),
    });
}

it('can query data', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test' });

    const networkResponse = await queryResult.fromNetwork;

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');

    expect(networkResponse).toEqual(FIRST_ITEM);
    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('respects fetch policies', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    let cacheOnlyQueryResult = queryProcessor.query(
        { ...firstItemRequest, fetchPolicy: 'cache-only' },
        { requesterId: 'test1' },
    );
    expect(cacheOnlyQueryResult.fromCache).toEqual({ data: undefined, loading: [], error: undefined });

    let cacheFirstQueryResult = queryProcessor.query(
        { ...firstItemRequest, fetchPolicy: 'cache-first' },
        { requesterId: 'test2' },
    );
    // No loading state, because fromCache shows cache state before query execution
    expect(cacheFirstQueryResult.fromCache).toEqual({ data: undefined, loading: [], error: undefined });

    let cacheAndNetworkQueryResult = queryProcessor.query(
        { ...firstItemRequest, fetchPolicy: 'cache-and-network' },
        { requesterId: 'test3' },
    );
    expect(cacheAndNetworkQueryResult.fromCache).toEqual({ data: undefined, loading: ['test2'], error: undefined });

    expect(cacheOnlyQueryResult.fromNetwork).toEqual(undefined);
    await expect(cacheFirstQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);
    await expect(cacheAndNetworkQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    cacheOnlyQueryResult = queryProcessor.query(
        { ...firstItemRequest, fetchPolicy: 'cache-only' },
        { requesterId: 'test1' },
    );
    expect(cacheOnlyQueryResult.fromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    cacheFirstQueryResult = queryProcessor.query(
        { ...firstItemRequest, fetchPolicy: 'cache-first' },
        { requesterId: 'test2' },
    );
    expect(cacheFirstQueryResult.fromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    cacheAndNetworkQueryResult = queryProcessor.query(
        { ...firstItemRequest, fetchPolicy: 'cache-and-network' },
        { requesterId: 'test3' },
    );
    expect(cacheAndNetworkQueryResult.fromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    expect(cacheOnlyQueryResult.fromNetwork).toEqual(undefined);
    expect(cacheFirstQueryResult.fromNetwork).toEqual(undefined);
    await expect(cacheAndNetworkQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test1');

    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('can reuse network requests', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstQueryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test1' });

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test1')).toEqual({
        data: undefined,
        loading: ['test1'],
        error: undefined,
    });

    const secondQueryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test2' });

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test2')).toEqual({
        data: undefined,
        loading: ['test1', 'test2'],
        error: undefined,
    });

    expect(firstQueryResult.fromNetwork).toBeDefined();
    expect(secondQueryResult.fromNetwork).toBeDefined();

    const networkResponse = await Promise.all([firstQueryResult.fromNetwork, secondQueryResult.fromNetwork]);

    const firstDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test1');
    const secondDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test2');

    expect(networkResponse[0]).toEqual(FIRST_ITEM);
    expect(networkResponse[1]).toEqual(FIRST_ITEM);
    expect(firstDataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
    expect(secondDataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('can opt-out from network request reuse', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstQueryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test1' });

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test1')).toEqual({
        data: undefined,
        loading: ['test1'],
        error: undefined,
    });

    const secondQueryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test2',
        disableNetworkRequestReuse: true,
    });

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test2')).toEqual({
        data: undefined,
        loading: ['test1', 'test2'],
        error: undefined,
    });

    expect(firstQueryResult.fromNetwork).toBeDefined();
    expect(secondQueryResult.fromNetwork).toBeDefined();

    const networkResponse = await Promise.all([firstQueryResult.fromNetwork, secondQueryResult.fromNetwork]);

    const firstDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test1');
    const secondDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test2');

    expect(networkResponse[0]).toEqual({ ...FIRST_ITEM, freshness: 2 });
    expect(networkResponse[1]).toEqual({ ...FIRST_ITEM, freshness: 2 });
    expect(firstDataFromCache).toEqual({ data: { ...FIRST_ITEM, freshness: 2 }, loading: [], error: undefined });
    expect(secondDataFromCache).toEqual({ data: { ...FIRST_ITEM, freshness: 2 }, loading: [], error: undefined });
});

it('can abort network request', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new AbortController();

    const queryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test',
        multiAbortSignal: abortController.signal,
    });

    abortController.abort();

    await expect(queryResult.fromNetwork).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');

    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: getAbortError() });
});

it('can abort network request for multiple requesters', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const firstAbortController = new AbortController();
    const secondAbortController = new AbortController();

    const firstQueryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test1',
        multiAbortSignal: firstAbortController.signal,
    });

    const secondQueryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test2',
        multiAbortSignal: secondAbortController.signal,
    });

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test1').loading).toEqual(['test1', 'test2']);

    firstAbortController.abort();
    secondAbortController.abort();

    await expect(firstQueryResult.fromNetwork).rejects.toEqual(getAbortError());
    await expect(secondQueryResult.fromNetwork).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test1');

    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: getAbortError() });
});

it('does not abort network request if not all requesters asked so', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new AbortController();

    const firstQueryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test1',
        multiAbortSignal: abortController.signal,
    });

    const secondQueryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test2',
    });

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test1').loading).toEqual(['test1', 'test2']);

    abortController.abort();

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test1').loading).toEqual(['test2']);

    await expect(firstQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);
    await expect(secondQueryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');

    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });
});

it('one requester can explicitly ask to abort network request for multiple requesters', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const abortController = new MultiAbortController();

    const firstQueryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test1',
        multiAbortSignal: abortController.signal,
    });

    const secondQueryResult = queryProcessor.query(firstItemRequest, {
        requesterId: 'test2',
    });

    expect(queryProcessor.getCompleteRequestState(firstItemRequest, 'test1').loading).toEqual(['test1', 'test2']);

    abortController.abort(true);

    await expect(firstQueryResult.fromNetwork).rejects.toEqual(getAbortError());
    await expect(secondQueryResult.fromNetwork).rejects.toEqual(getAbortError());

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');

    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: getAbortError() });
});

it('correctly aborts previous request when the next one is executed immediately with the same id', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();
    const secondItemRequest = getSecondItemRequest();

    const abortController = new AbortController();

    const firstQueryResult = queryProcessor.query(
        { ...firstItemRequest, getId: () => 'one-and-only' },
        {
            requesterId: 'test',
            multiAbortSignal: abortController.signal,
        },
    );

    abortController.abort();

    const secondQueryResult = queryProcessor.query(
        { ...secondItemRequest, getId: () => 'one-and-only' },
        {
            requesterId: 'test',
        },
    );

    await expect(firstQueryResult.fromNetwork).rejects.toEqual(getAbortError());
    await expect(secondQueryResult.fromNetwork).resolves.toEqual(SECOND_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState(
        { ...secondItemRequest, getId: () => 'one-and-only' },
        'test',
    );

    expect(dataFromCache).toEqual({ data: SECOND_ITEM, loading: [], error: undefined });
});
