import { mergeDeepNonUndefined } from '@fetcher/utils';
import { Mutation, NonUndefined } from '@fetcher/react-core';
import { useContext } from 'react';
import { DefaultRequest, DefaultRequestContext } from './DefaultRequestProvider';
import { DefaultMutation, DefaultMutationContext } from './DefaultMutationProvider';

export function useDefaultMutationMerger<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    mutation: Partial<Mutation<C, R, E, I>>,
): Mutation<C, R, E, I> {
    const defaultRequest = useContext<DefaultRequest<C, R, E, I>>(DefaultRequestContext);
    const defaultMutation = useContext<DefaultMutation<C, R, E, I>>(DefaultMutationContext);

    return {
        ...defaultRequest,
        ...defaultMutation,
        ...mutation,
        requestInit: mergeDeepNonUndefined(
            {},
            defaultRequest.requestInit,
            defaultMutation.requestInit,
            mutation.requestInit,
        ),
    };
}
