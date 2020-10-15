import * as React from 'react';
import { useClient } from '../Provider';
import { NonUndefined, Mutation } from '../../core';

export interface UseMutationOptions {
    requesterId: string;
}

export function useMutation({ requesterId }: UseMutationOptions) {
    const client = useClient();

    const mutate = React.useCallback(
        <C extends NonUndefined, R extends NonUndefined, E extends Error, I>(mutation: Mutation<C, R, E, I>) => {
            return client.mutate({ ...mutation, requesterId });
        },
        [client, requesterId],
    );

    return { mutate };
}
