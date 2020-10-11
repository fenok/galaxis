import { Client } from '../Client';
import { InMemoryCache } from '../../../in-memory-cache';
import { serializeError, deserializeError } from 'serialize-error';
import { FetchRequestInit } from '../../../fetch-network-request-factory/types';
import { getId } from '../../../fetch-network-request-factory/getId';
import { getUrl } from '../../../fetch-network-request-factory/getUrl';
import { YarfRequest } from '../../types';

const FIRST_ITEM = {
    id: 1,
    title: 'Foo',
};

const SECOND_ITEM = {
    id: 2,
    title: 'Bar',
};

const ALTERED_ITEM = {
    id: 1,
    title: 'Altered',
};

const INITIAL_FAKE_BACKEND_STATE: FakeBackendState = {
    items: {
        '1': FIRST_ITEM,
        '2': SECOND_ITEM,
    },
};

let fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

interface FakeBackendState {
    items: Record<string, Item>;
}

interface CacheState {
    items: { [key: string]: Item | undefined };
    auto: { [key: string]: any };
}

interface ResponseData {
    data: Item;
}

interface Item {
    id: number;
    title: string;
}

const fetchFn = (url: string, { method, body }: RequestInit): Promise<any> => {
    if (url.includes('/item/')) {
        const id = url[url.length - 1];

        if (method === 'POST' && typeof body === 'string') {
            return new Promise(resolve => {
                fakeBackendState.items[id] = JSON.parse(body);
                resolve({ data: fakeBackendState.items[id] });
            });
        } else {
            return new Promise(resolve => {
                const response = { data: fakeBackendState.items[id] };

                setTimeout(() => {
                    resolve(response);
                }, 100);
            });
        }
    } else {
        return Promise.reject({ error: { code: 'INVALID_PATH' } });
    }
};

const baseRequestInit = {
    root: 'http://test.test',
    path: '/item/:id',
};

const client = new Client({
    cache: new InMemoryCache({
        serializeError,
        deserializeError,
        initialSerializableState: {
            loading: {},
            error: {},
            data: {
                items: {},
                auto: {},
            },
        },
    }),
});

const request: YarfRequest<CacheState, ResponseData, Error, FetchRequestInit> = {
    getNetworkRequestFactory: requestInit => () => fetchFn(getUrl(requestInit), { ...requestInit }),
    getId: getId,
    fetchPolicy: 'cache-and-network',
    requestInit: {
        ...baseRequestInit,
        pathParams: { id: '1' },
    },
    toCache({ cacheData, data, requestId }) {
        return {
            ...cacheData,
            auto: { ...cacheData.auto, [requestId]: data },
        };
    },
    fromCache({ cacheData, requestId }) {
        const dataFromCache = cacheData.auto[requestId];
        return dataFromCache;
    },
};

const requestWithSharedData: YarfRequest<CacheState, ResponseData, Error, FetchRequestInit> = {
    ...request,
    toCache({ cacheData, data, requestInit }) {
        return {
            ...cacheData,
            items: { ...cacheData.items, [requestInit.pathParams!.id]: data.data },
        };
    },
    fromCache({ cacheData, requestInit }) {
        const dataFromCache = cacheData.items[requestInit.pathParams!.id];
        return dataFromCache ? { data: dataFromCache } : undefined;
    },
};

it('can query data', async () => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    const response = await client.query(
        { ...request, requestInit: { ...baseRequestInit, pathParams: { id: '1' } } },
        { requesterId: 'test' },
    ).fromNetwork;

    expect(response).toEqual({ data: FIRST_ITEM });
});

it('can mutate data', async () => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    const response = await client.mutate(
        {
            ...request,
            requestInit: {
                ...baseRequestInit,
                pathParams: { id: '1' },
                method: 'POST',
                body: JSON.stringify(ALTERED_ITEM),
            },
        },
        { requesterId: 'test' },
    );

    expect(response).toEqual({ data: ALTERED_ITEM });
});

it('caches queried data', async () => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    await client.query(
        { ...request, requestInit: { ...baseRequestInit, pathParams: { id: '1' } } },
        { requesterId: 'test' },
    ).fromNetwork;
    const { data: responseFromCache } = client.getState(
        { ...request, requestInit: { ...baseRequestInit, pathParams: { id: '1' } } },
        { requesterId: 'test' },
    );

    expect(responseFromCache).toEqual({ data: FIRST_ITEM });
});

it('caches queried data for request with custom caching', async () => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    await client.query(
        { ...requestWithSharedData, requestInit: { ...baseRequestInit, pathParams: { id: '1' } } },
        { requesterId: 'test' },
    ).fromNetwork;
    const { data: responseFromCache } = client.getState(
        { ...requestWithSharedData, requestInit: { ...baseRequestInit, pathParams: { id: '1' } } },
        { requesterId: 'test' },
    );

    expect(responseFromCache).toEqual({ data: FIRST_ITEM });
});

it("guarantees that old query data won't overwrite state after mutation", async () => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    const queryPromise = client.query(
        { ...requestWithSharedData, requestInit: { ...baseRequestInit, pathParams: { id: '1' } } },
        { requesterId: 'test' },
    );
    const mutatePromise = client.mutate(
        {
            ...requestWithSharedData,
            requestInit: {
                ...baseRequestInit,
                pathParams: { id: '1' },
                method: 'POST',
                body: JSON.stringify(ALTERED_ITEM),
            },
        },
        { requesterId: 'test' },
    );

    await Promise.all([queryPromise, mutatePromise]);

    const { data: responseFromCache } = client.getState(
        { ...requestWithSharedData, requestInit: { ...baseRequestInit, pathParams: { id: '1' } } },
        { requesterId: 'test' },
    );

    expect(responseFromCache).toEqual({ data: ALTERED_ITEM });
});
