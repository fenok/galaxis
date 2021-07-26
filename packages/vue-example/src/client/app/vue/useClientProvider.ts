import { Client } from '@galaxis/core';
import { inject, onMounted, provide } from 'vue';

export const client = Symbol('client');

export function useClientProvider(clientInstance: Client) {
    provide(client, clientInstance);

    onMounted(() => {
        clientInstance.onHydrateComplete();
    });
}

export function useClient<TClient extends Client>() {
    const instance = inject<TClient>(client);

    ensureClient(instance);

    return instance;
}

function ensureClient(client: Client | undefined): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}
