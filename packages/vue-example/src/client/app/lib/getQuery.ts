import { NonUndefined, Query } from '@galaxis/vue';
import { getParametrizedRequest, getStaticRequest } from '@galaxis/utils';
import { FetchResource, ResponseError, FetchResourceConstraint, DynamicFetchResource } from '@galaxis/fetch';
import { CacheData } from './CacheData';
import { ErrorResponse } from './ErrorResponse';

export function getQuery<
    TData extends NonUndefined,
    TResourceConstraint extends FetchResourceConstraint = FetchResourceConstraint,
    TFactoryParams = DynamicFetchResource<TResourceConstraint>
>(
    factory: (
        params: TFactoryParams,
    ) => Query<CacheData, TData, ResponseError<ErrorResponse>, FetchResource<TResourceConstraint>>,
) {
    return getParametrizedRequest(factory);
}

export function getStaticQuery<
    TData extends NonUndefined,
    TResourceConstraint extends FetchResourceConstraint = FetchResourceConstraint
>(query: Query<CacheData, TData, ResponseError<ErrorResponse>, FetchResource<TResourceConstraint>>) {
    return getStaticRequest(query);
}
