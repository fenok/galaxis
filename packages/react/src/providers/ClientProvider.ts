import { Cache, Client, NonUndefined } from '@galaxis/core';
import { createContext, createElement, PropsWithChildren, useContext, useEffect } from 'react';

type BaseClient = Client<NonUndefined, Cache<any>, NonUndefined, Error, any>;

const ClientContext = createContext<BaseClient | undefined>(undefined);

export interface ClientProviderProps {
    client: BaseClient;
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

const useClient = <TClient extends BaseClient>() => {
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
