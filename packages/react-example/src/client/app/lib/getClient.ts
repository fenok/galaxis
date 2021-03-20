import { Client } from '@fetcher/react';
import { InMemoryCache } from '@fetcher/in-memory-cache';
import { CacheData } from './CacheData';
import { getRequestFactory, getRequestId, processResponseJson } from '@fetcher/typed-fetch-request';
import { mergeDeepNonUndefined, objectHash } from '@fetcher/utils';

export const EMPTY_DATA: CacheData = {
    users: {},
    emails: {},
};

export interface GetClientOptions {
    fetch?: typeof fetch;
}

export function getClient({ fetch }: GetClientOptions) {
    const defaultRequest = {
        requestParams: {
            root: 'https://jsonplaceholder.typicode.com',
            path: '',
        },
        getRequestFactory: getRequestFactory({ fetch, processResponse: processResponseJson }),
        getRequestId: getRequestId({ hash: objectHash }),
    };

    return new Client({
        cache: new InMemoryCache({
            initialState: typeof window !== 'undefined' ? window.FETCHER_STATE : undefined,
            emptyData: EMPTY_DATA,
            enableDevTools: true,
        }),
        defaultQuery: {
            ...defaultRequest,
            preventExcessRequestOnHydrate: true,
            fetchPolicy: 'cache-and-network',
        },
        defaultMutation: defaultRequest,
        hash: objectHash,
        merge: mergeDeepNonUndefined,
    });
}
