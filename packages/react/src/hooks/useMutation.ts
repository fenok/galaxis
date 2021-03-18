import {
    DefaultMutation,
    DefaultMutationContext,
    DefaultRequest,
    DefaultRequestContext,
    RequestParamsMerger,
    RequestParamsMergerContext,
    useClient,
} from '../providers';
import { NonUndefined, Mutation } from '@fetcher/core';
import { useCallback, useContext } from 'react';

export function useMutation() {
    const client = useClient();

    const defaultRequest = useContext<DefaultRequest<NonUndefined, NonUndefined, Error, unknown>>(
        DefaultRequestContext,
    );
    const defaultMutation = useContext<DefaultMutation<NonUndefined, NonUndefined, Error, unknown>>(
        DefaultMutationContext,
    );
    const requestParamsMerger = useContext<RequestParamsMerger<unknown, unknown, unknown>>(RequestParamsMergerContext);

    const mutate = useCallback(
        <C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
            mutation: Partial<Mutation<C, D, E, R>>,
        ) => {
            return client.mutate({
                ...defaultRequest,
                ...defaultMutation,
                ...mutation,
                requestParams: requestParamsMerger(
                    defaultRequest.requestParams,
                    defaultMutation.requestParams,
                    mutation.requestParams,
                ),
            });
        },
        [client, defaultMutation, defaultRequest, requestParamsMerger],
    );

    return { mutate };
}
