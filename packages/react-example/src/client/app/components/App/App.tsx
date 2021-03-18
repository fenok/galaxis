import * as React from 'react';
import { Client, Provider, objectHash, mergeDeepNonUndefined } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';
import { getRequestFactory, getRequestId } from '@fetcher/typed-fetch-request';

interface Props {
    client: Client<any>;
    fetch?: typeof fetch;
}

const App: React.FC<Props> = ({ client, fetch }) => {
    console.log('APP_RENDER');
    return (
        <Provider
            client={client}
            request={{
                requestParams: {
                    root: 'https://jsonplaceholder.typicode.com',
                },
                getRequestFactory: getRequestFactory({ fetch }),
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
