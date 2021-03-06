import { createContext, createElement, FC, useContext } from 'react';
import { Query, NonUndefined, Provider, Client } from '@fetcher/react-core';
import merge from 'lodash.merge';

export const CommonQueryContext = createContext<Query<any, any, any, any>>({
    requestInit: {},
    fetchPolicy: 'cache-and-network',
    getRequestId() {
        return '';
    },
    getRequestFactory() {
        return () => Promise.reject(new Error('No request factory provided'));
    },
});

export const CommonQueryProvider: FC<{ query: Query<any, any, any, any> }> = ({ query, children }) => {
    return createElement(CommonQueryContext.Provider, { value: query }, children);
};

export const DefaultsProvider: FC<{ client: Client<any>; query: Query<any, any, any, any> }> = ({
    client,
    query,
    children,
}) => {
    return createElement(Provider, { client }, createElement(CommonQueryProvider, { query }, children));
};

export function useCommonQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(): Query<
    C,
    R,
    E,
    I
> {
    return useContext(CommonQueryContext) as Query<C, R, E, I>;
}

export function useCompleteQuery<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    query: Partial<Query<C, R, E, I>>,
): Query<C, R, E, I> {
    const commonQuery = useCommonQuery<C, R, E, I>();

    return {
        ...commonQuery,
        ...query,
        requestInit: merge({}, commonQuery.requestInit, query.requestInit),
    };
}
