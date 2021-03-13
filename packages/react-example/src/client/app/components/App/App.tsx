import * as React from 'react';
import { Client, DefaultsProvider } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';
import { getRequestFactory, getRequestId } from '@fetcher/typed-fetch-request';

interface Props {
    client: Client<any>;
    fetch?: typeof fetch;
}

const App: React.FC<Props> = ({ client, fetch }) => {
    console.log('APP_RENDER');
    return (
        <DefaultsProvider
            client={client}
            query={{
                preventExcessRequestOnHydrate: true,
                requestInit: {
                    root: 'https://jsonplaceholder.typicode.com',
                },
                fetchPolicy: 'cache-and-network',
                getRequestFactory: getRequestFactory({ fetch }),
                getRequestId: getRequestId,
            }}
        >
            <UserDisplay variant={1} />
            <UserDisplay variant={2} />
            <UserDisplay variant={3} />
        </DefaultsProvider>
    );
};

export { App };
export type { Props };
