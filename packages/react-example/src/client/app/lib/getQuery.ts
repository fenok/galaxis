import { NonUndefined, Query } from '@fetcher/react';
import { getParametrizedRequest, getStaticRequest, mergeDeepNonUndefined } from '@fetcher/utils';
import { RequestParams, ResponseError, RequestParamsConstraint, DynamicRequestParams } from '@fetcher/fetch';
import { CacheData } from './CacheData';
import { ErrorResponse } from './ErrorResponse';

export function getQuery<
    D extends NonUndefined,
    R extends RequestParamsConstraint = RequestParamsConstraint,
    P = DynamicRequestParams<R>
>(factory: (params: P) => Query<CacheData, D, ResponseError<ErrorResponse>, RequestParams<R>>) {
    return getParametrizedRequest(factory, mergeDeepNonUndefined);
}

export function getStaticQuery<D extends NonUndefined, R extends RequestParamsConstraint = RequestParamsConstraint>(
    query: Query<CacheData, D, ResponseError<ErrorResponse>, RequestParams<R>>,
) {
    return getStaticRequest(query, mergeDeepNonUndefined);
}
