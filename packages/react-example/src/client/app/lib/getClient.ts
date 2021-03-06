import { Client } from '@fetcher/react';
import { InMemoryCache } from '@fetcher/in-memory-cache';
import { CacheData } from './CacheData';

export const EMPTY_DATA: CacheData = {
    users: {},
    emails: {},
};

export function getClient() {
    return new Client<CacheData, InMemoryCache<CacheData>>({
        cache: new InMemoryCache({
            initialState: typeof window !== 'undefined' ? window.FETCHER_STATE : undefined,
            emptyData: EMPTY_DATA,
            enableDevTools: true,
        }),
    });
}
