import { Client, NonUndefined } from '@galaxis/react';
import { InMemoryCache } from '@galaxis/in-memory-cache';
import { CacheData } from './CacheData';
import { processResponseJson, request, requestId, ResponseError } from '@galaxis/fetch';
import { objectHash } from '@galaxis/utils';
import { ErrorResponse } from './ErrorResponse';

export const EMPTY_DATA: CacheData = {
    users: {},
    emails: {},
};

export interface GetClientOptions {
    fetch?: typeof fetch;
}

export type AppClient = Client<CacheData, InMemoryCache<CacheData>, NonUndefined, ResponseError<ErrorResponse>>;

export function getClient({ fetch }: GetClientOptions): AppClient {
    return new Client({
        cache: new InMemoryCache({
            initialState: typeof window !== 'undefined' ? window.GALAXIS_STATE : undefined,
            emptyData: EMPTY_DATA,
            enableDevTools: true,
        }),
        defaultRequest: {
            request: request({
                root: 'http://localhost:3001/api',
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
