import * as React from 'react';
import { Client, Provider, objectHash, mergeDeepNonUndefined, NonUndefined } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';
import {
    getRequestFactory,
    getRequestId,
    processResponseJson,
    RequestParams,
    ResponseError,
} from '@fetcher/typed-fetch-request';
import { CacheData } from '../../lib/CacheData';
import { InMemoryCache } from '@fetcher/in-memory-cache';
import { ErrorResponse } from '../../lib/ErrorResponse';

interface Props {
    client: Client<CacheData, InMemoryCache<CacheData>>;
    fetch?: typeof fetch;
}

const App: React.FC<Props> = ({ client, fetch }) => {
    console.log('APP_RENDER');
    return (
        <Provider<CacheData, InMemoryCache<CacheData>, NonUndefined, ResponseError<ErrorResponse>, RequestParams>
            client={client}
            request={{
                requestParams: {
                    root: 'https://jsonplaceholder.typicode.com',
                    path: '',
                },
                getRequestFactory: getRequestFactory({ fetch, processResponse: processResponseJson }),
                getRequestId: getRequestId,
            }}
            query={{
                preventExcessRequestOnHydrate: true,
                fetchPolicy: 'cache-and-network',
            }}
            requestHashGetter={objectHash}
            requestParamsMerger={mergeDeepNonUndefined}
        >
            <UserDisplay variant={1} />
            <UserDisplay variant={2} />
            <UserDisplay variant={3} />
        </Provider>
    );
};

export { App };
export type { Props };
