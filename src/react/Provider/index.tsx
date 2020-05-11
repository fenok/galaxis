import * as React from 'react';
import { Client, SsrPromisesManager } from '../../core/client';

const ClientContext = React.createContext<Client | null>(null);
const SsrPromisesManagerContext = React.createContext<SsrPromisesManager | null>(null);

interface ProviderProps {
    client: Client;
}

const Provider: React.FC<ProviderProps> = ({ children, client }) => {
    React.useEffect(() => {
        client.enableDataRefetch();
    }, [client]);

    return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
};

export { Provider, ClientContext, SsrPromisesManagerContext };
