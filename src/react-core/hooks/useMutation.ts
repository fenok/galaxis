import * as React from 'react';
import { ClientContext } from '../Provider';
import { ResponseData, YarfRequest } from '../../core/request';
import { ensureClient } from './ensureClient';
import { useId } from './useId';

export function useMutation() {
    const requesterId = useId();
    const client = React.useContext(ClientContext);

    ensureClient(client);

    const mutate = React.useCallback(
        <C, R extends ResponseData, E extends Error, I>(request: YarfRequest<C, R, E, I>) => {
            return client.mutate(request, { requesterId: requesterId });
        },
        [client, requesterId],
    );

    return { mutate };
}
