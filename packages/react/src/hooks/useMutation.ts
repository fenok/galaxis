import { useClient } from '../providers';
import { Mutation, NonUndefined } from '@fetcher/core';
import { useGetCompleteMutation } from './useGetCompleteMutation';
import { useMemoOnce } from './useMemoOnce';

export function useMutation() {
    const client = useClient();
    const getCompleteMutation = useGetCompleteMutation();

    const mutate = useMemoOnce(
        <C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
            mutation: Partial<Mutation<C, D, E, R>>,
        ) => {
            return client.mutate(getCompleteMutation(mutation));
        },
        [client, getCompleteMutation],
    );

    return { mutate };
}
