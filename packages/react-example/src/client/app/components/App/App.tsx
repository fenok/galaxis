import { ClientProvider } from '@galaxis/react';
import { UserDisplay } from '../UserDisplay';
import { AppClient } from '../../lib/getClient';
import { FC } from 'react';
import { Reset } from '../Reset';
import { Clear } from '../Clear';

interface Props {
    client: AppClient;
}

const App: FC<Props> = ({ client }) => {
    return (
        <ClientProvider client={client}>
            <Reset />
            <Clear />
            <UserDisplay fetchPolicy={'cache-only'} />
            <UserDisplay fetchPolicy={'cache-first'} />
            <UserDisplay fetchPolicy={'cache-and-network'} />
            <UserDisplay fetchPolicy={'no-cache'} />
        </ClientProvider>
    );
};

export { App };
export type { Props };
