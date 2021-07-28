import { Mutation, NonUndefined, Query } from '@galaxis/react';
import { FetchVariables, FetchResource, FetchVariablesConstraint, ResponseError } from '@galaxis/fetch';
import { CacheData } from './CacheData';
import { ErrorResponse } from './ErrorResponse';

export function getQuery<
    TData extends NonUndefined,
    TVariablesConstraint extends FetchVariablesConstraint = FetchVariablesConstraint,
    TVariables = FetchVariables<TVariablesConstraint>
>(
    factory: (
        variables: TVariables,
    ) => Query<CacheData, TData, ResponseError<ErrorResponse>, FetchResource<TVariablesConstraint>>,
) {
    return ({
        variables,
        ...request
    }: { variables: TVariables } & Partial<
        Query<CacheData, TData, ResponseError<ErrorResponse>, FetchResource<TVariablesConstraint>>
    >) => ({ ...factory(variables), ...request });
}

export function getMutation<
    TData extends NonUndefined,
    TVariablesConstraint extends FetchVariablesConstraint = FetchVariablesConstraint,
    TVariables = FetchVariables<TVariablesConstraint>
>(
    factory: (
        variables: TVariables,
    ) => Mutation<CacheData, TData, ResponseError<ErrorResponse>, FetchResource<TVariablesConstraint>>,
) {
    return ({
        variables,
        ...request
    }: { variables: TVariables } & Partial<
        Mutation<CacheData, TData, ResponseError<ErrorResponse>, FetchResource<TVariablesConstraint>>
    >) => ({ ...factory(variables), ...request });
}
