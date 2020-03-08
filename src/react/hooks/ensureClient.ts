import { Client } from '../../core/client';

export function ensureClient(client: Client | null): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}
