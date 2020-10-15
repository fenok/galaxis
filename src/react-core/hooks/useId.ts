import * as React from 'react';
import { useClient } from '../Provider';
import { ensureClient } from './ensureClient';

// Not necessarily SSR-friendly, just unique for each call in current render
export function useId(outerId?: string) {
    const client = useClient();

    ensureClient(client);

    const [id] = React.useState(() => (outerId !== undefined ? outerId : client.generateRequesterId()));

    return id;
}
