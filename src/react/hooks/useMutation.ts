import * as React from 'react';
import { ClientContext } from '../Provider';
import { PartialRequestData, BC, PPC, QPC, RC, SDC, EC, HC } from '../../core/request';
import { ensureClient } from './ensureClient';
import { useId } from './useId';

export function useMutation() {
    const callerId = useId();
    const client = React.useContext(ClientContext);

    ensureClient(client);

    const mutate = React.useCallback(
        <C extends SDC, R extends RC, E extends EC, P extends PPC, Q extends QPC, B extends BC, H extends HC>(
            request: PartialRequestData<C, R, E, P, Q, B, H>,
        ) => {
            return client.mutate(request, { callerId: callerId });
        },
        [client, callerId],
    );

    return { mutate };
}
