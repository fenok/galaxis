import { useClient } from '../Provider';
import { NonUndefined, Mutation } from '@fetcher/core';
import { useCallback } from 'react';

export function useMutation() {
    const client = useClient();

    const mutate = useCallback(
        <C extends NonUndefined, R extends NonUndefined, E extends Error, I>(mutation: Mutation<C, R, E, I>) => {
            return client.mutate({ ...mutation });
        },
        [client],
    );

    return { mutate };
}
