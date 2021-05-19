import { Client, NonUndefined, Cache } from '@galaxis/core';
import { onMounted, provide, inject } from 'vue';

export const client = Symbol('client');

export function useClientProvider(clientInstance: Client) {
    provide(client, clientInstance);

    onMounted(() => {
        clientInstance.onHydrateComplete();
    });
}

export function useClient<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
>() {
    const instance = inject<Client<C, CACHE, BD, BE, BR>>(client);

    ensureClient(instance);

    return instance;
}

function ensureClient(client: Client | undefined): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}
