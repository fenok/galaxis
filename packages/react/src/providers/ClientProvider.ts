import { Client, NonUndefined, Cache, BaseMutation, BaseQuery } from '@fetcher/core';
import { useContext, useEffect, createContext, FC, createElement } from 'react';

const ClientContext = createContext<Client<NonUndefined> | null>(null);

export interface ClientProviderProps<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    client: Client<C, CACHE>;
    dynamicDefaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    dynamicDefaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;
    preventOnHydrateCompleteCall?: boolean;
}

const ClientProvider: FC<ClientProviderProps> = ({
    children,
    client,
    dynamicDefaultQuery,
    dynamicDefaultMutation,
    preventOnHydrateCompleteCall,
}) => {
    useEffect(() => {
        if (!preventOnHydrateCompleteCall) {
            client.onHydrateComplete();
        }
    }, [client, preventOnHydrateCompleteCall]);

    if (dynamicDefaultQuery) {
        client.setDynamicDefaultQuery(dynamicDefaultQuery);
    }

    if (dynamicDefaultMutation) {
        client.setDynamicDefaultMutation(dynamicDefaultMutation);
    }

    return createElement(ClientContext.Provider, { value: client }, children);
};

const useClient = <C extends NonUndefined, CACHE extends Cache<C> = Cache<C>>() => {
    const client = useContext(ClientContext);

    ensureClient(client);

    return client as Client<C, CACHE>;
};

function ensureClient(client: Client<NonUndefined> | null): asserts client is Client<NonUndefined> {
    if (!client) {
        throw new Error('No client provided');
    }
}

export { ClientProvider, useClient };
