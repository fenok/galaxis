import { useClient } from '../providers';
import { NonUndefined, ObservableMutation, Mutation } from '@galaxis/core';
import { useEffect, useReducer, useRef } from 'react';

export function useMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    mutation?: Mutation<C, D, E, R>,
) {
    const client = useClient();

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const observableMutation = useRef<ObservableMutation<C, D, E, R>>();
    observableMutation.current = observableMutation.current || new ObservableMutation(forceUpdate);

    observableMutation.current.setOptions(client, mutation);

    useEffect(() => {
        return () => {
            observableMutation.current?.dispose();
        };
    }, []);

    return [
        observableMutation.current.execute,
        { ...observableMutation.current.getState(), reset: observableMutation.current.reset },
    ] as const;
}
