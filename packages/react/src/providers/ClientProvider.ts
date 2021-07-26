import { Client } from '@galaxis/core';
import { createContext, createElement, PropsWithChildren, useContext, useEffect } from 'react';

const ClientContext = createContext<Client | undefined>(undefined);

export interface ClientProviderProps<TClient extends Client> {
    client: TClient;
    preventOnHydrateCompleteCall?: boolean;
}

const ClientProvider = <TClient extends Client>({
    children,
    client,
    preventOnHydrateCompleteCall,
}: PropsWithChildren<ClientProviderProps<TClient>>) => {
    useEffect(() => {
        if (!preventOnHydrateCompleteCall) {
            client.onHydrateComplete();
        }
    }, [client, preventOnHydrateCompleteCall]);

    return createElement(ClientContext.Provider, { value: client }, children);
};

const useClient = <TClient extends Client>() => {
    const client = useContext(ClientContext);

    ensureClient(client);

    return client as TClient;
};

function ensureClient(client: Client | undefined): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}

export { ClientProvider, useClient };
