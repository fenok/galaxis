import { Client } from '@galaxis/core';
import { createContext, createElement, PropsWithChildren, useContext, useEffect } from 'react';

const ClientContext = createContext<Client<any, any, any, any> | undefined>(undefined);

export interface ClientProviderProps {
    client: Client<any, any, any, any>;
    preventOnHydrateCompleteCall?: boolean;
}

const ClientProvider = ({ children, client, preventOnHydrateCompleteCall }: PropsWithChildren<ClientProviderProps>) => {
    useEffect(() => {
        if (!preventOnHydrateCompleteCall) {
            client.onHydrateComplete();
        }
    }, [client, preventOnHydrateCompleteCall]);

    return createElement(ClientContext.Provider, { value: client }, children);
};

const useClient = <TClient extends Client<any, any, any, any>>() => {
    const client = useContext(ClientContext);

    ensureClient(client);

    return client as TClient;
};

function ensureClient<TClient>(client: TClient | undefined): asserts client is TClient {
    if (!client) {
        throw new Error('No client provided');
    }
}

export { ClientProvider, useClient };
