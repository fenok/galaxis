import {
    DefaultMutation,
    DefaultMutationContext,
    DefaultRequest,
    DefaultRequestContext,
    MergeRequestParams,
    MergeRequestParamsContext,
    useClient,
} from '../providers';
import { NonUndefined, Mutation } from '@fetcher/core';
import { useCallback, useContext } from 'react';

export function useMutation() {
    const client = useClient();

    const defaultRequest = useContext<DefaultRequest>(DefaultRequestContext);
    const defaultMutation = useContext<DefaultMutation>(DefaultMutationContext);
    const requestParamsMerger = useContext<MergeRequestParams<unknown>>(MergeRequestParamsContext);

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
            } as Mutation<C, D, E, R>);
        },
        [client, defaultMutation, defaultRequest, requestParamsMerger],
    );

    return { mutate };
}
