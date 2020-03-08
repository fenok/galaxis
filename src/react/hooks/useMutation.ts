import * as React from 'react';
import { BC, PPC, QPC, RC, SDC } from '../../core/request/types';
import { ClientContext } from '../Provider';
import { PartialRequestData } from '../../core/request';
import { ensureClient } from './ensureClient';
import { useComponentId } from './useComponentId';

export function useMutation() {
    const componentId = useComponentId();
    const client = React.useContext(ClientContext);

    ensureClient(client);

    const mutate = React.useCallback(
        <C extends SDC, R extends RC, P extends PPC, Q extends QPC, B extends BC>(
            request: PartialRequestData<C, R, P, Q, B>,
        ) => {
            return client.mutate(request, { callerId: componentId });
        },
        [client, componentId],
    );

    return { mutate };
}
