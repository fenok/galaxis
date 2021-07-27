import { NonUndefined, Query, Mutation } from '@galaxis/react';
import { getParametrizedRequest, getStaticRequest } from '@galaxis/utils';
import { FetchResource, ResponseError, FetchResourceConstraint, DynamicFetchResource } from '@galaxis/fetch';
import { CacheData } from './CacheData';
import { ErrorResponse } from './ErrorResponse';

export function getQuery<
    D extends NonUndefined,
    R extends FetchResourceConstraint = FetchResourceConstraint,
    P = DynamicFetchResource<R>
>(factory: (params: P) => Query<CacheData, D, ResponseError<ErrorResponse>, FetchResource<R>>) {
    return getParametrizedRequest(factory);
}

export function getStaticQuery<D extends NonUndefined, R extends FetchResourceConstraint = FetchResourceConstraint>(
    query: Query<CacheData, D, ResponseError<ErrorResponse>, FetchResource<R>>,
) {
    return getStaticRequest(query);
}

export function getMutation<
    D extends NonUndefined,
    R extends FetchResourceConstraint = FetchResourceConstraint,
    P = DynamicFetchResource<R>
>(factory: (params: P) => Mutation<CacheData, D, ResponseError<ErrorResponse>, FetchResource<R>>) {
    return getParametrizedRequest(factory);
}

export function getStaticMutation<D extends NonUndefined, R extends FetchResourceConstraint = FetchResourceConstraint>(
    mutation: Mutation<CacheData, D, ResponseError<ErrorResponse>, FetchResource<R>>,
) {
    return getStaticRequest(mutation);
}
