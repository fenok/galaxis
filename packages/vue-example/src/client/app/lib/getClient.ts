import { Client, NonUndefined } from '@galaxis/vue';
import { InMemoryCache } from '@galaxis/in-memory-cache';
import { CacheData } from './CacheData';
import { processResponseJson, FetchResource, ResponseError, requestId, request } from '@galaxis/fetch';
import { objectHash } from '@galaxis/utils';
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
    FetchResource
>;

export function getClient({ fetch }: GetClientOptions): AppClient {
    return new Client({
        cache: new InMemoryCache({
            initialState: typeof window !== 'undefined' ? window.GALAXIS_STATE : undefined,
            emptyData: EMPTY_DATA,
            enableDevTools: true,
        }),
        defaultRequest: {
            request: request({
                root: 'https://jsonplaceholder.typicode.com',
                fetch,
                processResponse: processResponseJson,
            }),
        },
        defaultQuery: {
            optimizeOnHydrate: true,
            fetchPolicy: 'cache-and-network',
        },
        requestId: requestId({ hash: objectHash }),
    });
}
