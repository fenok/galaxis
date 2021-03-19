import { DefaultRequest } from './DefaultRequestProvider';
import { NonUndefined, BaseQuery, FetchPolicy } from '@fetcher/core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultQuery<
    C extends NonUndefined = NonUndefined,
    D extends NonUndefined = NonUndefined,
    E extends Error = Error,
    R = unknown
> = Partial<DefaultRequest<C, D, E, R>> & Omit<BaseQuery<C, D, E, R>, keyof DefaultRequest<C, D, E, R>>;

export const initialDefaultQuery = {
    fetchPolicy: 'no-cache' as FetchPolicy,
};

export const DefaultQueryContext = createContext<DefaultQuery>(initialDefaultQuery);

export interface DefaultQueryProviderOptions<
    C extends NonUndefined = NonUndefined,
    D extends NonUndefined = NonUndefined,
    E extends Error = Error,
    R = unknown
> {
    query: DefaultQuery<C, D, E, R>;
}

export const DefaultQueryProvider = <C extends NonUndefined, D extends NonUndefined, E extends Error, R>({
    query,
    children,
}: PropsWithChildren<DefaultQueryProviderOptions<C, D, E, R>>) => {
    return createElement(DefaultQueryContext.Provider, { value: query }, children);
};
