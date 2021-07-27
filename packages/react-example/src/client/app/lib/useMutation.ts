import { Mutation, NonUndefined, useMutation as useMutationLib } from '@galaxis/react';
import { CacheData } from './CacheData';
import { FetchResource, ResponseError } from '@galaxis/fetch';
import { ErrorResponse } from './ErrorResponse';

export function useMutation<TData extends NonUndefined>(
    mutation?: Mutation<CacheData, TData, ResponseError<ErrorResponse>, FetchResource>,
) {
    return useMutationLib<CacheData, TData, ResponseError<ErrorResponse>, FetchResource>(mutation);
}
