import * as React from 'react';
import { Client, NonUndefined } from '../../core';
import { ensureClient } from './ensureClient';

const ClientContext = React.createContext<Client<any> | null>(null);

interface ProviderProps {
    client: Client<any>;
}

const Provider: React.FC<ProviderProps> = ({ children, client }) => {
    React.useEffect(() => {
        client.onHydrateComplete();
    }, [client]);

    client.resetRequesterIdGenerator();

    return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
};

const useClient = <T extends NonUndefined>() => {
    const client = React.useContext(ClientContext);

    ensureClient(client);

    return client as Client<T>;
};

export { Provider, useClient };
