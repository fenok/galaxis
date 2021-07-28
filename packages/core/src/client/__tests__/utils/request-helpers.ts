import { RequestQueue } from '../../RequestQueue';
import { Query, Request, Resource, Mutation } from '../../../types';
import { QueryProcessor } from '../../QueryProcessor';
import { TestCache } from './TestCache';
import { wait } from '../../../promise';
import { Client } from '../../Client';

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

export const SECOND_ITEM: ItemEntity = {
    id: '2',
    value: 'second',
    freshness: 1,
};

export interface TestRequestInit extends Resource {
    key: 'item';
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

    const freshnesses = new Map<unknown, number>();

    return (resource: TestRequestInit, abortSignal?: AbortSignal) => {
        freshnesses.set(resource, (freshnesses.get(resource) || 0) + 1);

        return new Promise<ItemEntity>((resolve, reject) => {
            function onAbort() {
                reject(getAbortError());
            }

            if (abortSignal?.aborted) {
                onAbort();
            } else {
                abortSignal?.addEventListener('abort', onAbort);
            }

            void wait(resource.time ?? 200).then(() => {
                if (resource.updateItem) {
                    state[resource.id] = { ...state[resource.id], ...resource.updateItem };
                }

                resolve({ ...state[resource.id], freshness: freshnesses.get(resource) || 0 });
            });
        });
    };
}

export interface TestCacheData {
    items: Record<string, ItemEntity>;
}

export const INITIAL_CACHE_DATA: TestCacheData = {
    items: {},
};

export const BASE_REQUEST: Pick<Request<TestCacheData, ItemEntity, Error, TestRequestInit>, 'requestId'> = {
    requestId(resource: TestRequestInit): string {
        return Buffer.from(JSON.stringify(resource)).toString('base64');
    },
};

export const BASE_QUERY: typeof BASE_REQUEST &
    Pick<Query<TestCacheData, ItemEntity, Error, TestRequestInit>, 'fetchPolicy'> = {
    ...BASE_REQUEST,
    fetchPolicy: 'cache-and-network',
};

export const ITEM_REQUEST: Omit<Query<TestCacheData, ItemEntity, Error, TestRequestInit>, 'resource' | 'request'> = {
    ...BASE_QUERY,
    toCache({ cacheData, data }) {
        return { ...cacheData, items: { ...cacheData.items, [data.id]: data } };
    },
    fromCache({ cacheData, resource }) {
        return cacheData.items[resource.id];
    },
};

export function getFirstItemRequest(
    getRequestFactory = getGetRequestFactory(),
): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        request: getRequestFactory,
        resource: { key: 'item', id: '1' },
    };
}

export function getFailingFirstItemRequest(): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        request: () => Promise.reject(getNetworkError()),
        resource: { key: 'item', id: '1' },
    };
}

export function getSecondItemRequest(
    getRequestFactory = getGetRequestFactory(),
): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        request: getRequestFactory,
        resource: { key: 'item', id: '2' },
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
        hash(value: unknown): string {
            return JSON.stringify(value);
        },
    });
}

export function getMutationProcessor(requestQueue = getRequestQueue(), cache = getCache()) {
    return new QueryProcessor({
        cache,
        requestQueue,
        hash(value: unknown): string {
            return JSON.stringify(value);
        },
    });
}

export function getClient(cache = getCache()) {
    return new Client({
        cache,
        defaultQuery: getFirstItemRequest(),
        defaultMutation: getFirstItemRequest() as Mutation<any, any, any, any>,
        hash(value: unknown): string {
            return JSON.stringify(value);
        },
    });
}
