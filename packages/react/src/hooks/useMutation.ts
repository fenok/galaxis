import { useClient } from '../providers';
import { NonUndefined, ObservableMutation, Mutation, Resource } from '@galaxis/core';
import { useEffect, useReducer, useRef } from 'react';

export function useMutation<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource
>(mutation?: Mutation<TCacheData, TData, TError, TResource>) {
    const client = useClient();

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const observableMutation = useRef<ObservableMutation<TCacheData, TData, TError, TResource>>();
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
