import { useClient } from '../providers';
import { Mutation, NonUndefined, ObservableMutation } from '@galaxis/core';
import { useReducer, useRef } from 'react';
import { useMemoByHash } from './useMemoByHash';

export function useMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    mutation?: Mutation<C, D, E, R>,
) {
    const client = useClient();

    const memoizedMutation = useMemoByHash(mutation, client.hash);

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const observableMutation = useRef<ObservableMutation<C, D, E, R>>();
    observableMutation.current = observableMutation.current || new ObservableMutation(forceUpdate);

    observableMutation.current.setOptions(client, memoizedMutation);

    return [
        observableMutation.current.execute,
        { ...observableMutation.current.getState(), reset: observableMutation.current.reset },
    ];
}
