import { mergeDeepNonUndefined } from '@fetcher/utils';
import { NonUndefined, Query } from '@fetcher/react-core';
import { DefaultRequest, DefaultRequestContext } from './DefaultRequestProvider';
import { DefaultQuery, DefaultQueryContext } from './DefaultQueryProvider';
import { useContext } from 'react';

export function useDefaultQueryMerger<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Partial<Query<C, R, E, I>>,
): Query<C, R, E, I> {
    const defaultRequest = useContext<DefaultRequest<C, R, E, I>>(DefaultRequestContext);
    const defaultQuery = useContext<DefaultQuery<C, R, E, I>>(DefaultQueryContext);

    return {
        ...defaultRequest,
        ...defaultQuery,
        ...query,
        requestInit: mergeDeepNonUndefined({}, defaultRequest.requestInit, defaultQuery.requestInit, query.requestInit),
    };
}
