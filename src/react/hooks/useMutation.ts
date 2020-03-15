import * as React from 'react';
import { BC, PPC, QPC, RC, SDC, EC } from '../../core/request/types';
import { ClientContext } from '../Provider';
import { PartialRequestData } from '../../core/request';
import { ensureClient } from './ensureClient';
import { useId } from './useId';

export function useMutation() {
    const callerId = useId();
    const client = React.useContext(ClientContext);

    ensureClient(client);

    const mutate = React.useCallback(
        <C extends SDC, R extends RC, E extends EC, P extends PPC, Q extends QPC, B extends BC>(
            request: PartialRequestData<C, R, E, P, Q, B>,
        ) => {
            return client.mutate(request, { callerId: callerId });
        },
        [client, callerId],
    );

    return { mutate };
}
