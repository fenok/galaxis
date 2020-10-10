import * as React from 'react';
import { useClient } from '../Provider';
import { ensureClient } from './ensureClient';
import { useId } from './useId';
import { NonUndefined, YarfRequest } from '../../core';

export function useMutation() {
    const requesterId = useId();
    const client = useClient();

    ensureClient(client);

    const mutate = React.useCallback(
        <C extends NonUndefined, R extends NonUndefined, E extends Error, I>(request: YarfRequest<C, R, E, I>) => {
            return client.mutate(request, { requesterId: requesterId });
        },
        [client, requesterId],
    );

    return { mutate };
}
