import { NonUndefined, Query } from '@fetcher/core';
import { useContext } from 'react';
import {
    DefaultQuery,
    DefaultQueryContext,
    DefaultRequest,
    DefaultRequestContext,
    RequestParamsMerger,
    RequestParamsMergerContext,
} from '../providers';

export function useDefaultQueryMerger<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query: Partial<Query<C, D, E, R>>,
): Query<C, D, E, R> {
    const defaultRequest = useContext<DefaultRequest<C, D, E, R>>(DefaultRequestContext);
    const defaultQuery = useContext<DefaultQuery<C, D, E, R>>(DefaultQueryContext);
    const requestParamsMerger = useContext<RequestParamsMerger<R, R, R>>(RequestParamsMergerContext);

    return {
        ...defaultRequest,
        ...defaultQuery,
        ...query,
        requestParams: requestParamsMerger(
            defaultRequest.requestParams,
            defaultQuery.requestParams,
            query.requestParams,
        ),
    };
}
