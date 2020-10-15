import * as React from 'react';
import { useClient } from '../Provider';

// Not necessarily SSR-friendly, just unique for each call in current render
export function useId(outerId?: string) {
    const client = useClient();

    const [id] = React.useState(() => (outerId !== undefined ? outerId : client.generateRequesterId()));

    return id;
}
