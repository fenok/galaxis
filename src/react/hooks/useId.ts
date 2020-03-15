import * as React from 'react';
import { ClientContext } from '../Provider';
import { ensureClient } from './ensureClient';

// Not necessarily SSR-friendly, just unique for each call in current render
export function useId() {
    const client = React.useContext(ClientContext);

    ensureClient(client);

    const [id] = React.useState(() => client.generateId());

    return id;
}
