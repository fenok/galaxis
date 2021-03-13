import { NonUndefined, getParametrizedQuery, Query } from '@fetcher/react';
import {
    FetchRequestParams,
    ResponseError,
    FetchRequestParamsConstraint,
    DynamicFetchRequestParams,
} from '@fetcher/typed-fetch-request';
import { CacheData } from './CacheData';
import { ErrorResponse } from './ErrorResponse';

export function getQuery<
    D extends NonUndefined,
    R extends FetchRequestParamsConstraint = FetchRequestParamsConstraint,
    P = DynamicFetchRequestParams<R>
>(factory: (params: P) => Partial<Query<CacheData, D, ResponseError<ErrorResponse>, FetchRequestParams<R>>>) {
    return getParametrizedQuery(factory);
}
