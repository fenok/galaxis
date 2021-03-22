import * as React from 'react';
import { useState } from 'react';
import { ClientProvider } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';
import { AppClient } from '../../lib/getClient';

interface Props {
    client: AppClient;
}

const App: React.FC<Props> = ({ client }) => {
    const [root, setRoot] = useState('https://jsonplaceholder.typicode.com');
    return (
        <ClientProvider client={client} dynamicDefaultRequest={{ requestParams: { root } }}>
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
