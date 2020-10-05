import * as React from 'react';
import { ClientContext } from '../Provider';
import { RC, CC, EC, YarfRequest } from '../../core/request';
import { ensureClient } from './ensureClient';
import { useId } from './useId';

export function useMutation() {
    const requesterId = useId();
    const client = React.useContext(ClientContext);

    ensureClient(client);

    const mutate = React.useCallback(
        <C extends CC, R extends RC, E extends EC, I>(request: YarfRequest<C, R, E, I>) => {
            return client.mutate(request, { requesterId: requesterId });
        },
        [client, requesterId],
    );

    return { mutate };
}
