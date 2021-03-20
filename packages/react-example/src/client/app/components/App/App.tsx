import * as React from 'react';
import { Client, ClientProvider, NonUndefined } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';
import { CacheData } from '../../lib/CacheData';
import { InMemoryCache } from '@fetcher/in-memory-cache';
import { GlobalStaticRequestParams, ResponseError } from '@fetcher/typed-fetch-request';
import { ErrorResponse } from '../../lib/ErrorResponse';
import { useState } from 'react';

interface Props {
    client: Client<
        CacheData,
        InMemoryCache<CacheData>,
        NonUndefined,
        ResponseError<ErrorResponse>,
        GlobalStaticRequestParams
    >;
}

const App: React.FC<Props> = ({ client }) => {
    const [root, setRoot] = useState('https://jsonplaceholder.typicode.com');
    return (
        <ClientProvider
            client={client}
            dynamicDefaultMutation={{ requestParams: { root } }}
            dynamicDefaultQuery={{ requestParams: { root } }}
        >
            <input
                style={{ width: '100%', marginBottom: '20px' }}
                value={root}
                onChange={(e) => setRoot(e.target.value)}
            />
            <UserDisplay variant={1} />
            <UserDisplay variant={2} />
            <UserDisplay variant={3} />
        </ClientProvider>
    );
};

export { App };
export type { Props };
