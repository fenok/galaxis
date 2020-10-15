import { RequestQueue } from '../client/RequestQueue';
import { Query, BaseRequest, CommonRequestOptions } from '../types';
import { QueryProcessor } from '../client/QueryProcessor';
import { TestCache } from './TestCache';
import { wait } from '../promise';
import { Client } from '../client';

export interface ItemEntity {
    id: string;
    value: string;
    freshness: number;
    optimistic?: true;
}

export const FIRST_ITEM: ItemEntity = {
    id: '1',
    value: 'first',
    freshness: 1,
};

export const FIRST_ITEM_UPDATE_DTO: Partial<Omit<ItemEntity, 'id' | 'freshness'>> = {
    value: 'first-updated',
};

export const FIRST_ITEM_UPDATED: ItemEntity = {
    id: '1',
    value: 'first-updated',
    freshness: 1,
};

export const OPTIMISTIC_FIRST_ITEM: ItemEntity = {
    id: '1',
    value: 'first',
    freshness: 1,
    optimistic: true,
};

export const SECOND_ITEM: ItemEntity = {
    id: '2',
    value: 'second',
    freshness: 1,
};

export interface TestRequestInit {
    id: string;
    updateItem?: Partial<Omit<ItemEntity, 'id' | 'freshness'>>;
    time?: number;
}

export function getAbortError() {
    return new DOMException('Failed to fetch', 'AbortError');
}

export function getNetworkError() {
    return new Error('Network error');
}

export function getGetRequestFactory() {
    const state: Record<string, ItemEntity> = { '1': FIRST_ITEM, '2': SECOND_ITEM };

    return ({ requestInit }: CommonRequestOptions<TestRequestInit>) => {
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

                wait(requestInit.time ?? 200).then(() => {
                    if (requestInit.updateItem) {
                        state[requestInit.id] = { ...state[requestInit.id], ...requestInit.updateItem };
                    }

                    resolve({ ...state[requestInit.id], freshness });
                });
            });
        };
    };
}

export interface TestCacheData {
    items: Record<string, ItemEntity>;
}

export const INITIAL_CACHE_DATA: TestCacheData = {
    items: {},
};

export const BASE_REQUEST: Pick<
    BaseRequest<TestCacheData, ItemEntity, Error, TestRequestInit>,
    'getRequestId' | 'requesterId'
> = {
    requesterId: 'test',
    getRequestId({ requestInit }: CommonRequestOptions<TestRequestInit>): string {
        return Buffer.from(JSON.stringify(requestInit)).toString('base64');
    },
};

export const BASE_QUERY: typeof BASE_REQUEST &
    Pick<Query<TestCacheData, ItemEntity, Error, TestRequestInit>, 'fetchPolicy'> = {
    ...BASE_REQUEST,
    fetchPolicy: 'cache-and-network',
};

export const ITEM_REQUEST: Omit<
    Query<TestCacheData, ItemEntity, Error, TestRequestInit>,
    'requestInit' | 'getRequestFactory'
> = {
    ...BASE_QUERY,
    toCache({ cacheData, data }) {
        return { ...cacheData, items: { ...cacheData.items, [data.id]: data } };
    },
    fromCache({ cacheData, requestInit }) {
        return cacheData.items[requestInit.id];
    },
};

export function getFirstItemRequest(
    getRequestFactory = getGetRequestFactory(),
): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory,
        requestInit: { id: '1' },
    };
}

export function getFailingFirstItemRequest(): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory: () => () => Promise.reject(getNetworkError()),
        requestInit: { id: '1' },
    };
}

export function getFirstItemRequestWithOptimisticResponse(
    getRequestFactory = getGetRequestFactory(),
): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory,
        requestInit: { id: '1' },
        optimisticData: OPTIMISTIC_FIRST_ITEM,
        isOptimisticData({ data }): boolean {
            return Boolean(data.optimistic);
        },
        removeOptimisticData({ cacheData, data }) {
            const newItems = Object.fromEntries(
                Object.entries(cacheData.items).filter(([, { optimistic, id }]) => !(optimistic && data.id === id)),
            );

            return {
                ...cacheData,
                items: newItems,
            };
        },
    };
}

export function getSecondItemRequest(
    getRequestFactory = getGetRequestFactory(),
): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory,
        requestInit: { id: '2' },
    };
}

export function getRequestQueue() {
    return new RequestQueue();
}

export function getCache() {
    return new TestCache({ initialData: INITIAL_CACHE_DATA, emptyData: INITIAL_CACHE_DATA });
}

export function getQueryProcessor(requestQueue = getRequestQueue(), cache = getCache()) {
    return new QueryProcessor({
        cache,
        requestQueue,
    });
}

export function getMutationProcessor(requestQueue = getRequestQueue(), cache = getCache()) {
    return new QueryProcessor({
        cache,
        requestQueue,
    });
}

export function getClient(cache = getCache()) {
    return new Client({ cache });
}
