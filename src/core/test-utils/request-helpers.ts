import { RequestQueue } from '../client/RequestQueue';
import { Query, BaseRequest, CommonRequestOptions } from '../types';
import { QueryProcessor } from '../client/QueryProcessor';
import { TestCache } from './TestCache';
import { wait } from '../promise';

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
    id: '1' | '2';
}

export function getAbortError() {
    return new DOMException('Failed to fetch', 'AbortError');
}

export function getNetworkError() {
    return new Error('Network error');
}

export function getNetworkRequestFactory({ requestInit }: CommonRequestOptions<TestRequestInit>) {
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

export function getFirstItemRequest(): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory: getNetworkRequestFactory,
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

export function getFirstItemRequestWithOptimisticResponse(): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory: getNetworkRequestFactory,
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

export function getSecondItemRequest(): Query<TestCacheData, ItemEntity, Error, TestRequestInit> {
    return {
        ...ITEM_REQUEST,
        getRequestFactory: getNetworkRequestFactory,
        requestInit: { id: '2' },
    };
}

export function getQueryProcessor() {
    return new QueryProcessor({
        cache: new TestCache({ initialData: INITIAL_CACHE_DATA, emptyData: INITIAL_CACHE_DATA }),
        requestQueue: new RequestQueue(),
    });
}
