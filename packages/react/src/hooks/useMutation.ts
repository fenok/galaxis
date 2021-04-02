import { useClient } from '../providers';
import { Mutation, NonUndefined } from '@galaxis/core';
import { useEffect, useReducer, useRef } from 'react';
import { ManagedMutationWrapper } from './ManagedMutationWrapper';

export function useMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    mutation?: Mutation<C, D, E, R>,
) {
    const client = useClient();

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const managedMutation = useRef<ManagedMutationWrapper<C, D, E, R>>();
    managedMutation.current = managedMutation.current || new ManagedMutationWrapper(forceUpdate);

    useEffect(() => {
        return () => {
            managedMutation.current?.cleanup();
        };
    }, []);

    return managedMutation.current.process(mutation, client);
}
