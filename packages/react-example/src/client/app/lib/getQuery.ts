import { NonUndefined, getParametrizedQuery, Query } from '@fetcher/react';
import {
    FetchRequestInit,
    ResponseError,
    FetchRequestInitParams,
    DynamicFetchRequestInit,
} from '@fetcher/typed-fetch-request';
import { CacheData } from './CacheData';
import { ErrorResponse } from './ErrorResponse';

export function getQuery<
    D extends NonUndefined,
    R extends FetchRequestInitParams = FetchRequestInitParams,
    P = DynamicFetchRequestInit<R>
>(factory: (params: P) => Partial<Query<CacheData, D, ResponseError<ErrorResponse>, FetchRequestInit<R>>>) {
    return getParametrizedQuery(factory);
}
