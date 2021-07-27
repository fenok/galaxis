import { Client } from '@galaxis/core';
import { inject, onMounted, provide } from 'vue';

export const client = Symbol('client');

export interface ClientProviderOptions {
    client: Client<any, any, any, any, any>;
    preventOnHydrateCompleteCall?: boolean;
}

export function useClientProvider({ client: clientInstance, preventOnHydrateCompleteCall }: ClientProviderOptions) {
    provide(client, clientInstance);

    onMounted(() => {
        if (!preventOnHydrateCompleteCall) {
            clientInstance.onHydrateComplete();
        }
    });
}

export function useClient<TClient extends Client<any, any, any, any, any>>() {
    const instance = inject<TClient>(client);

    ensureClient(instance);

    return instance;
}

function ensureClient(client: Client | undefined): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}
