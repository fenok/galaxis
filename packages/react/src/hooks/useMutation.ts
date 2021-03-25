import { useClient } from '../providers';
import { Mutation, MutationManagerResult, NonUndefined } from '@fetcher/core';
import { useEffect, useReducer, useRef } from 'react';

export function useMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    mutation?: Mutation<C, D, E, R>,
) {
    const client = useClient();

    const [, forceUpdate] = useReducer((i: number) => i + 1, 0);

    const mutationHash = mutation ? client.hash(mutation) : undefined;

    const mutationManagerResult = useRef<[string | undefined, MutationManagerResult<D, E>, () => void]>();
    const onChange = useRef((result: MutationManagerResult<D, E>) => {
        if (mutationManagerResult.current) {
            mutationManagerResult.current[1] = result;
            forceUpdate();
        }
    });

    if (!mutationManagerResult.current || mutationManagerResult.current[0] !== mutationHash) {
        mutationManagerResult.current?.[2]();
        mutationManagerResult.current = [mutationHash, ...client.manageMutation<D, E, R>(mutation, onChange.current)];
    }

    useEffect(() => {
        return () => {
            mutationManagerResult.current?.[2]();
        };
    }, []);

    return mutationManagerResult.current[1];
}
