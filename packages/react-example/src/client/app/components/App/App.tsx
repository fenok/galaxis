import * as React from 'react';
import { Client, Provider, NonUndefined } from '@fetcher/react';
import { objectHash, mergeDeepNonUndefined } from '@fetcher/utils';
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
            defaultRequest={{
                requestParams: {
                    root: 'https://jsonplaceholder.typicode.com',
                    path: '',
                },
                getRequestFactory: getRequestFactory({ fetch, processResponse: processResponseJson }),
                getRequestId: getRequestId({ hash: objectHash }),
            }}
            defaultQuery={{
                preventExcessRequestOnHydrate: true,
                fetchPolicy: 'cache-and-network',
            }}
            hashRequest={objectHash}
            mergeRequestParams={mergeDeepNonUndefined}
        >
            <UserDisplay variant={1} />
            <UserDisplay variant={2} />
            <UserDisplay variant={3} />
        </Provider>
    );
};

export { App };
export type { Props };
