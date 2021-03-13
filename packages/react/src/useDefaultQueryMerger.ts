import { mergeDeepNonUndefined } from '@fetcher/utils';
import { NonUndefined, BaseQuery } from '@fetcher/react-core';
import { DefaultRequest, DefaultRequestContext } from './DefaultRequestProvider';
import { DefaultQuery, DefaultQueryContext } from './DefaultQueryProvider';
import { useContext } from 'react';

export function useDefaultQueryMerger<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Partial<BaseQuery<C, R, E, I>>,
): BaseQuery<C, R, E, I> {
    const defaultRequest = useContext<DefaultRequest<C, R, E, I>>(DefaultRequestContext);
    const defaultQuery = useContext<DefaultQuery<C, R, E, I>>(DefaultQueryContext);

    return {
        ...defaultRequest,
        ...defaultQuery,
        ...query,
        requestParams: mergeDeepNonUndefined(
            {},
            defaultRequest.requestParams,
            defaultQuery.requestParams,
            query.requestParams,
        ),
    };
}
