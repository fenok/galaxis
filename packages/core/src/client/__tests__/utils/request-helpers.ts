import { RequestQueue } from '../../RequestQueue';
import { FromCacheOptions, Resource, ToCacheOptions } from '../../../types';
import { QueryProcessor } from '../../QueryProcessor';
import { CacheState, InMemoryCache } from './InMemoryCache';
import { Client } from '../../Client';
import { wait } from './promise-helpers';

export interface ItemEntity {
    id: string;
    value: string;
    freshness: number;
}

export interface ItemEntityUpdateDTO {
    value?: string;
}

export const FIRST_ITEM: ItemEntity = {
    id: '1',
    value: 'first',
    freshness: 1,
};

export const FIRST_ITEM_UPDATED: ItemEntity = {
    id: '1',
    value: 'first-updated',
    freshness: 1,
};

export const FIRST_ITEM_UPDATE_DTO: ItemEntityUpdateDTO = {
    value: 'first-updated',
};

export const SECOND_ITEM: ItemEntity = {
    id: '2',
    value: 'second',
    freshness: 1,
};

export interface ItemResource extends Resource {
    name: 'item';
    id: string;
    updateItem?: ItemEntityUpdateDTO;
    time?: number;
}

export function getAbortError() {
    return new DOMException('Failed to fetch', 'AbortError');
}

export function getNetworkError() {
    return new Error('Network error');
}

export function request() {
    const state: Record<string, ItemEntity> = { '1': FIRST_ITEM, '2': SECOND_ITEM };

    const freshnesses = new Map<unknown, number>();

    return (resource: ItemResource, abortSignal?: AbortSignal) => {
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

export interface CacheData {
    items: Record<string, ItemEntity>;
}

export const EMPTY_CACHE_DATA = {
    items: {},
};

export const INITIAL_CACHE_STATE: CacheState<CacheData> = {
    data: EMPTY_CACHE_DATA,
    errors: {},
};

export const FIRST_ITEM_RESOURCE: ItemResource = { name: 'item', id: '1' };
export const SECOND_ITEM_RESOURCE: ItemResource = { name: 'item', id: '2' };

export function toCache({ cacheData, data }: ToCacheOptions<CacheData, ItemEntity, ItemResource>) {
    return { ...cacheData, items: { ...cacheData.items, [data.id]: data } };
}

export function fromCache({ cacheData, resource }: FromCacheOptions<CacheData, ItemResource>) {
    return cacheData.items[resource.id];
}

export function requestId(resource: ItemResource): string {
    return Buffer.from(JSON.stringify(resource)).toString('base64');
}

export function getRequestQueue() {
    return new RequestQueue();
}

export function getCache() {
    return new InMemoryCache({ initialState: INITIAL_CACHE_STATE, emptyData: EMPTY_CACHE_DATA });
}

export function getQueryProcessor(requestQueue = getRequestQueue(), cache = getCache()) {
    return new QueryProcessor({
        cache,
        requestQueue,
        requestId,
    });
}

export function getMutationProcessor(requestQueue = getRequestQueue(), cache = getCache()) {
    return new QueryProcessor({
        cache,
        requestQueue,
        requestId,
    });
}

export function getClient(cache = getCache()) {
    return new Client<CacheData, InMemoryCache<CacheData>, ItemEntity, Error, ItemResource>({
        cache,
        requestId,
    });
}
