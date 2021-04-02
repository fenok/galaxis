import { ClientProvider } from '@galaxis/react';
import { UserDisplay } from '../UserDisplay';
import { AppClient } from '../../lib/getClient';
import { FC } from 'react';

interface Props {
    client: AppClient;
}

const App: FC<Props> = ({ client }) => {
    return (
        <ClientProvider client={client}>
            <UserDisplay fetchPolicy={'cache-only'} />
            <UserDisplay fetchPolicy={'cache-first'} />
            <UserDisplay fetchPolicy={'cache-and-network'} />
            <UserDisplay fetchPolicy={'no-cache'} />
        </ClientProvider>
    );
};

export { App };
export type { Props };
