import { useClient } from '../providers';
import { Mutation, NonUndefined } from '@fetcher/core';
import { useMemoOnce } from './useMemoOnce';

export function useMutation() {
    const client = useClient();

    const mutate = useMemoOnce(
        <C extends NonUndefined, D extends NonUndefined, E extends Error, R>(mutation: Mutation<C, D, E, R>) => {
            return client.mutate(mutation);
        },
        [client],
    );

    return { mutate };
}
