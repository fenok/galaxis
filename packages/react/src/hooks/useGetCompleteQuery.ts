import { NonUndefined, Query } from '@fetcher/core';
import { useContext } from 'react';
import {
    DefaultQuery,
    DefaultQueryContext,
    DefaultRequest,
    DefaultRequestContext,
    MergeRequestParams,
    MergeRequestParamsContext,
} from '../providers';
import { useMemoOnce } from './useMemoOnce';

export function useGetCompleteQuery() {
    const defaultRequest = useContext<DefaultRequest>(DefaultRequestContext);
    const defaultQuery = useContext<DefaultQuery>(DefaultQueryContext);
    const mergeRequestParams = useContext<MergeRequestParams<unknown>>(MergeRequestParamsContext);

    return useMemoOnce(
        <C extends NonUndefined, D extends NonUndefined, E extends Error, R>(query: Partial<Query<C, D, E, R>>) =>
            ({
                ...defaultRequest,
                ...defaultQuery,
                ...query,
                requestParams: mergeRequestParams(
                    defaultRequest.requestParams,
                    defaultQuery.requestParams,
                    query.requestParams,
                ),
            } as Query<C, D, E, R>),
        [defaultRequest, defaultQuery, mergeRequestParams],
    );
}
