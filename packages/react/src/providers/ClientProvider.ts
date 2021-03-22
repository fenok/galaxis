import { BaseMutation, BaseQuery, Cache, Client, NonUndefined, BaseRequest } from '@fetcher/core';
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
    dynamicDefaultRequest?: Partial<BaseRequest<C, BD, BE, BR>>;
    dynamicDefaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    dynamicDefaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;
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
    dynamicDefaultRequest,
    dynamicDefaultQuery,
    dynamicDefaultMutation,
    preventOnHydrateCompleteCall,
}: PropsWithChildren<ClientProviderProps<C, CACHE, BD, BE, BR>>) => {
    useEffect(() => {
        if (!preventOnHydrateCompleteCall) {
            client.onHydrateComplete();
        }
    }, [client, preventOnHydrateCompleteCall]);

    if (dynamicDefaultRequest) {
        client.setDynamicDefaultRequest(dynamicDefaultRequest);
    }

    if (dynamicDefaultQuery) {
        client.setDynamicDefaultQuery(dynamicDefaultQuery);
    }

    if (dynamicDefaultMutation) {
        client.setDynamicDefaultMutation(dynamicDefaultMutation);
    }

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
