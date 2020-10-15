import * as React from 'react';
import { useClient } from '../Provider';
import { useId } from './useId';
import { NonUndefined, Mutation } from '../../core';

export function useMutation() {
    const requesterId = useId();
    const client = useClient();

    const mutate = React.useCallback(
        <C extends NonUndefined, R extends NonUndefined, E extends Error, I>(request: Mutation<C, R, E, I>) => {
            return client.mutate({ ...request, requesterId });
        },
        [client, requesterId],
    );

    return { mutate };
}
