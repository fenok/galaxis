import * as React from 'react';
import { Client, ClientProvider } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';
import { CacheData } from '../../lib/CacheData';
import { InMemoryCache } from '@fetcher/in-memory-cache';

interface Props {
    client: Client<CacheData, InMemoryCache<CacheData>>;
}

const App: React.FC<Props> = ({ client }) => {
    console.log('APP_RENDER');
    return (
        <ClientProvider client={client}>
            <UserDisplay variant={1} />
            <UserDisplay variant={2} />
            <UserDisplay variant={3} />
        </ClientProvider>
    );
};

export { App };
export type { Props };
