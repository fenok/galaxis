import { Cache, Client, NonUndefined } from '@fetcher/core';
import { createContext, createElement, PropsWithChildren, useContext, useEffect } from 'react';

const ClientContext = createContext<Client | undefined>(undefined);

export interface ClientProviderProps<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    client: Client<C, CACHE, BD, BE, BR>;
    preventOnHydrateCompleteCall?: boolean;
}

const ClientProvider = <
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
>({
    children,
    client,
    preventOnHydrateCompleteCall,
}: PropsWithChildren<ClientProviderProps<C, CACHE, BD, BE, BR>>) => {
    useEffect(() => {
        if (!preventOnHydrateCompleteCall) {
            client.onHydrateComplete();
        }
    }, [client, preventOnHydrateCompleteCall]);

    return createElement(ClientContext.Provider, { value: client }, children);
};

const useClient = <
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
>() => {
    const client = useContext(ClientContext);

    ensureClient(client);

    return client as Client<C, CACHE, BD, BE, BR>;
};

function ensureClient(client: Client | undefined): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}

export { ClientProvider, useClient };
