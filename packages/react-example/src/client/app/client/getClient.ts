import { Client } from '@fetcher/react';
import { InMemoryCache } from '@fetcher/in-memory-cache';

export interface ErrorResponse {}

export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
}

export interface CacheData {
    users?: User[];
}

export const EMPTY_DATA: CacheData = {
    users: undefined,
};

let CLIENT_INSTANCE: Client<CacheData, InMemoryCache<CacheData>> | undefined;

export function getClient() {
    if (typeof window === 'undefined') {
        return createClient();
    }

    if (CLIENT_INSTANCE) {
        return CLIENT_INSTANCE;
    }

    return (CLIENT_INSTANCE = createClient());
}

export function createClient() {
    return new Client({
        cache: new InMemoryCache({
            initialState: typeof window !== 'undefined' ? (window as any).FETCHER_STATE : undefined,
            emptyData: EMPTY_DATA,
            enableDevTools: true,
        }),
    });
}
