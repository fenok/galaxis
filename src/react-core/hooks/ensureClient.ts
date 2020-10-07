import { Client } from '../../core/client';

export function ensureClient(client: Client<any> | null): asserts client is Client {
    if (!client) {
        throw new Error('No client provided');
    }
}
