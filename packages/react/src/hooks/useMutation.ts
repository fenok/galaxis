import { useClient } from '../providers';
import { Mutation, NonUndefined, MutationManager } from '@fetcher/core';
import { useReducer, useRef } from 'react';

export function useMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    mutation: Mutation<C, D, E, R>,
) {
    const client = useClient();

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const mutationManager = useRef<MutationManager<C, D, E, R>>(new MutationManager({ forceUpdate }));

    return mutationManager.current.process(mutation, client);
}
