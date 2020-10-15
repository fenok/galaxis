import { Client, NonUndefined } from '../../core';
import { ensureClient } from './ensureClient';
import { useContext, useEffect, createContext, FC, createElement } from 'react';

const ClientContext = createContext<Client<any> | null>(null);

interface ProviderProps {
    client: Client<any>;
}

const Provider: FC<ProviderProps> = ({ children, client }) => {
    useEffect(() => {
        client.onHydrateComplete();
    }, [client]);

    return createElement(ClientContext.Provider, { value: client }, children);
};

const useClient = <T extends NonUndefined>() => {
    const client = useContext(ClientContext);

    ensureClient(client);

    return client as Client<T>;
};

export { Provider, useClient };
