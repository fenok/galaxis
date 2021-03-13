import { mergeDeepNonUndefined } from '@fetcher/utils';
import { BaseMutation, NonUndefined } from '@fetcher/react-core';
import { useContext } from 'react';
import { DefaultRequest, DefaultRequestContext } from './DefaultRequestProvider';
import { DefaultMutation, DefaultMutationContext } from './DefaultMutationProvider';

export function useDefaultMutationMerger<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    mutation: Partial<BaseMutation<C, R, E, I>>,
): BaseMutation<C, R, E, I> {
    const defaultRequest = useContext<DefaultRequest<C, R, E, I>>(DefaultRequestContext);
    const defaultMutation = useContext<DefaultMutation<C, R, E, I>>(DefaultMutationContext);

    return {
        ...defaultRequest,
        ...defaultMutation,
        ...mutation,
        requestParams: mergeDeepNonUndefined(
            {},
            defaultRequest.requestParams,
            defaultMutation.requestParams,
            mutation.requestParams,
        ),
    };
}
