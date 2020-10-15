import * as React from 'react';
import { Client, NonUndefined } from '../../core';

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

const useClient = <T extends NonUndefined>() =>
    React.useContext((ClientContext as unknown) as React.Context<Client<T>>);

export { Provider, useClient };
