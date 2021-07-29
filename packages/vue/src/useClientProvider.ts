import { Client, NonUndefined, Cache } from '@galaxis/core';
import { inject, onMounted, provide } from 'vue';

type BaseClient = Client<NonUndefined, Cache<any>, NonUndefined, Error, any>;

export const client = Symbol('client');

export interface ClientProviderOptions {
    client: BaseClient;
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

export function useClient<TClient extends BaseClient>() {
    const instance = inject<TClient>(client);

    ensureClient(instance);

    return instance;
}

function ensureClient<TClient>(client: TClient | undefined): asserts client is TClient {
    if (!client) {
        throw new Error('No client provided');
    }
}
