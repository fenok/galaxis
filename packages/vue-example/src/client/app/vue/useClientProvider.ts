import { Client } from '@galaxis/core';
import { onMounted, provide, inject } from 'vue';

export const client = Symbol('client');

export function useClientProvider(clientInstance: Client) {
    provide(client, clientInstance);

    onMounted(() => {
        clientInstance.onHydrateComplete();
    });
}

export function useClient() {
    const instance = inject<Client>(client);

    ensureClient(instance);

    return instance;
}

function ensureClient(client: Client | undefined): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}
