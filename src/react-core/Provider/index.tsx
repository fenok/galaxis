import * as React from 'react';
import { Client, SsrPromisesManager } from '../../core/client';
import { NonUndefined } from '../../core/types';

const ClientContext = React.createContext<Client<any> | null>(null);
const SsrPromisesManagerContext = React.createContext<SsrPromisesManager | null>(null);

interface ProviderProps {
    client: Client<any>;
}

const Provider: React.FC<ProviderProps> = ({ children, client }) => {
    React.useEffect(() => {
        client.enableDataRefetch();
    }, [client]);

    client.resetRequesterIdGenerator();

    return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
};

const useClient = <T extends NonUndefined>() =>
    React.useContext((ClientContext as unknown) as React.Context<Client<T>>);

export { Provider, ClientContext, SsrPromisesManagerContext, useClient };
