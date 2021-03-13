import { NonUndefined, getParametrizedQuery, Query } from '@fetcher/react';
import {
    RequestParams,
    ResponseError,
    RequestParamsConstraint,
    DynamicRequestParams,
} from '@fetcher/typed-fetch-request';
import { CacheData } from './CacheData';
import { ErrorResponse } from './ErrorResponse';

export function getQuery<
    D extends NonUndefined,
    R extends RequestParamsConstraint = RequestParamsConstraint,
    P = DynamicRequestParams<R>
>(factory: (params: P) => Partial<Query<CacheData, D, ResponseError<ErrorResponse>, RequestParams<R>>>) {
    return getParametrizedQuery(factory);
}
