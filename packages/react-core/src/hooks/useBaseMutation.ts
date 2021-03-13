import { useClient } from '../ClientProvider';
import { NonUndefined, BaseMutation } from '@fetcher/core';
import { useCallback } from 'react';

export function useBaseMutation() {
    const client = useClient();

    const mutate = useCallback(
        <C extends NonUndefined, D extends NonUndefined, E extends Error, R>(mutation: BaseMutation<C, D, E, R>) => {
            return client.mutate({ ...mutation });
        },
        [client],
    );

    return { mutate };
}
