import * as React from 'react';
import { Provider, Client } from '@fetcher/react';
import { UserDisplay } from '../UserDisplay';

interface Props {
    client: Client<any>;
}

const App: React.FC<Props> = ({ client }) => {
    console.log('APP_RENDER');
    return (
        <Provider client={client}>
            <UserDisplay />
        </Provider>
    );
};

export { App };
export type { Props };
