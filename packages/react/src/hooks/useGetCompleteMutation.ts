import { NonUndefined } from '@fetcher/core';
import { useContext } from 'react';
import {
    DefaultMutation,
    DefaultMutationContext,
    DefaultRequest,
    DefaultRequestContext,
    MergeRequestParams,
    MergeRequestParamsContext,
} from '../providers';
import { useMemoOnce } from './useMemoOnce';
import { Mutation } from '../../../core/src';

export function useGetCompleteMutation() {
    const defaultRequest = useContext<DefaultRequest>(DefaultRequestContext);
    const defaultMutation = useContext<DefaultMutation>(DefaultMutationContext);
    const mergeRequestParams = useContext<MergeRequestParams<unknown>>(MergeRequestParamsContext);

    return useMemoOnce(
        <C extends NonUndefined, D extends NonUndefined, E extends Error, R>(mutation: Partial<Mutation<C, D, E, R>>) =>
            ({
                ...defaultRequest,
                ...defaultMutation,
                ...mutation,
                requestParams: mergeRequestParams(
                    defaultRequest.requestParams,
                    defaultMutation.requestParams,
                    mutation.requestParams,
                ),
            } as Mutation<C, D, E, R>),
        [defaultRequest, defaultMutation, mergeRequestParams],
    );
}
