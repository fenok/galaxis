import { mergeDeepNonUndefined } from '@fetcher/utils';
import { BaseMutation, NonUndefined } from '@fetcher/react-core';
import { useContext } from 'react';
import { DefaultRequest, DefaultRequestContext } from './DefaultRequestProvider';
import { DefaultMutation, DefaultMutationContext } from './DefaultMutationProvider';

export function useDefaultMutationMerger<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    mutation: Partial<BaseMutation<C, D, E, R>>,
): BaseMutation<C, D, E, R> {
    const defaultRequest = useContext<DefaultRequest<C, D, E, R>>(DefaultRequestContext);
    const defaultMutation = useContext<DefaultMutation<C, D, E, R>>(DefaultMutationContext);

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
