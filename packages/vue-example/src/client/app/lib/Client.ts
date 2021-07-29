import { Client, NonUndefined, useClient as useClientLib } from '@galaxis/vue';
import { InMemoryCache } from '@galaxis/in-memory-cache';
import { CacheData, EMPTY_DATA } from './CacheData';
import { FetchResource, processResponseJson, request, requestId, ResponseError } from '@galaxis/fetch';
import { objectHash } from '@galaxis/utils';
import { ErrorResponse } from './ErrorResponse';

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
        },
        requestId: requestId({ hash: objectHash }),
    });
}

export function useClient() {
    return useClientLib<AppClient>();
}
