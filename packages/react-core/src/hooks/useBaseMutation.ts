import { useClient } from '../ClientProvider';
import { NonUndefined, BaseMutation } from '@fetcher/core';
import { useCallback } from 'react';

export function useBaseMutation() {
    const client = useClient();

    const mutate = useCallback(
        <C extends NonUndefined, R extends NonUndefined, E extends Error, I>(mutation: BaseMutation<C, R, E, I>) => {
            return client.mutate({ ...mutation });
        },
        [client],
    );

    return { mutate };
}
