import * as React from 'react';
import { BC, PPC, QPC, RC, SDC } from '../../core/request/types';
import { ClientContext } from '../Provider';
import { PartialRequestData } from '../../core/request';
import { ensureClient } from './ensureClient';
import { getRequestId } from './getRequestId';
import { useComponentId } from './useComponentId';

interface MutationOptions<
    C extends SDC = any,
    R extends RC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any
> {
    getPartialRequestId?(request: PartialRequestData<C, R, P, Q, B>): string | number;
}

export function useMutation<
    C extends SDC = any,
    R extends RC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any
>(request: PartialRequestData<C, R, P, Q, B>, { getPartialRequestId }: MutationOptions = {}) {
    const componentId = useComponentId();
    const client = React.useContext(ClientContext);

    ensureClient(client);

    const requestId = getRequestId(request, client, getPartialRequestId);

    const mutate = React.useCallback(() => {
        return client.mutate(request, { callerId: componentId });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, requestId, componentId]);

    return { mutate };
}
