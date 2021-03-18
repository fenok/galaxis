import { Client, NonUndefined } from '@fetcher/core';
import { useContext, useEffect, createContext, FC, createElement } from 'react';

const ClientContext = createContext<Client<NonUndefined> | null>(null);

interface ProviderProps {
    client: Client<NonUndefined>;
}

const ClientProvider: FC<ProviderProps> = ({ children, client }) => {
    useEffect(() => {
        client.onHydrateComplete();
    }, [client]);

    return createElement(ClientContext.Provider, { value: client }, children);
};

const useClient = <C extends NonUndefined>() => {
    const client = useContext(ClientContext);

    ensureClient(client);

    return client as Client<C>;
};

function ensureClient(client: Client<NonUndefined> | null): asserts client is Client<NonUndefined> {
    if (!client) {
        throw new Error('No client provided');
    }
}

export { ClientProvider, useClient };
