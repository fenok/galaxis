import { RequestQueue } from '../client/RequestQueue';
import { InternalQuery, InternalRequest, RequestOptions } from '../types';
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

    return ({ requestParams }: RequestOptions<TestRequestInit>) => {
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

                void wait(requestParams.time ?? 200).then(() => {
                    if (requestParams.updateItem) {
                        state[requestParams.id] = { ...state[requestParams.id], ...requestParams.updateItem };
                    }

                    resolve({ ...state[requestParams.id], freshness });
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

export const BASE_REQUEST: Pick<InternalRequest<TestCacheData, ItemEntity, Error, TestRequestInit>, 'getRequestId'> = {
    getRequestId({ requestParams }: RequestOptions<TestRequestInit>): string {
        return Buffer.from(JSON.stringify(requestParams)).toString('base64');
    },
};

export const BASE_QUERY: typeof BASE_REQUEST &
    Pick<InternalQuery<TestCacheData, ItemEntity, Error, TestRequestInit>, 'fetchPolicy'> = {
    ...BASE_REQUEST,
    fetchPolicy: 'cache-and-network',
};

export const ITEM_REQUEST: Omit<
    InternalQuery<TestCacheData, ItemEntity, Error, TestRequestInit>,
    'requestParams' | 'getRequestFactory'
> = {
    ...BASE_QUERY,
    toCache({ cacheData, data }) {
        return { ...cacheData, items: { ...cacheData.items, [data.id]: data } };
    },
    fromCache({ cacheData, requestParams }) {
        return cacheData.items[requestParams.id];
    },
};

export function getFirstItemRequest(
    getRequestFactory = getGetRequestFactory(),
): InternalQuery<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory,
        requestParams: { id: '1' },
    };
}

export function getFailingFirstItemRequest(): InternalQuery<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory: () => () => Promise.reject(getNetworkError()),
        requestParams: { id: '1' },
    };
}

export function getSecondItemRequest(
    getRequestFactory = getGetRequestFactory(),
): InternalQuery<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory,
        requestParams: { id: '2' },
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
    return new Client({
        cache,
        defaultQuery: getFirstItemRequest(),
        defaultMutation: getFirstItemRequest(),
        hash(value: unknown): string | number {
            return JSON.stringify(value);
        },
        merge<R1, R2>(r1: R1, r2: R2): R1 & R2 {
            return { ...r1, ...r2 };
        },
    });
}
