import { Client, NonUndefined } from '@galaxis/react';
import { InMemoryCache } from '@galaxis/in-memory-cache';
import { CacheData } from './CacheData';
import { getRequestFactory, getRequestId, processResponseJson, RequestParams, ResponseError } from '@galaxis/fetch';
import { mergeDeepNonUndefined, objectHash } from '@galaxis/utils';
import { ErrorResponse } from './ErrorResponse';

export const EMPTY_DATA: CacheData = {
    users: {},
    emails: {},
};

export interface GetClientOptions {
    fetch?: typeof fetch;
}

export type AppClient = Client<
    CacheData,
    InMemoryCache<CacheData>,
    NonUndefined,
    ResponseError<ErrorResponse>,
    RequestParams
>;

export function getClient({ fetch }: GetClientOptions): AppClient {
    return new Client({
        cache: new InMemoryCache({
            initialState: typeof window !== 'undefined' ? window.GALAXIS_STATE : undefined,
            emptyData: EMPTY_DATA,
            enableDevTools: true,
        }),
        defaultRequest: {
            requestParams: {
                root: 'https://jsonplaceholder.typicode.com',
                path: '',
            },
            getRequestFactory: getRequestFactory({ fetch, processResponse: processResponseJson }),
            getRequestId: getRequestId({ hash: objectHash }),
        },
        defaultQuery: {
            optimizeOnHydrate: true,
            fetchPolicy: 'cache-and-network',
        },
        hash: objectHash,
        merge: mergeDeepNonUndefined,
    });
}
