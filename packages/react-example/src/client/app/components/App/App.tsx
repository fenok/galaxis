import * as React from 'react';
import { ClientProvider } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';
import { AppClient } from '../../lib/getClient';

interface Props {
    client: AppClient;
}

const App: React.FC<Props> = ({ client }) => {
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
