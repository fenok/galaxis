import { DefaultRequest } from './DefaultRequestProvider';
import { NonUndefined, BaseQuery } from '@fetcher/core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultQuery<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
> = Partial<DefaultRequest<C, D, E, R>> & Omit<BaseQuery<C, D, E, R>, keyof DefaultRequest<C, D, E, R>>;

export const initialDefaultQuery: DefaultQuery = {
    fetchPolicy: 'no-cache',
};

export const DefaultQueryContext = createContext<DefaultQuery>(initialDefaultQuery);

export interface DefaultQueryProviderOptions<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
> {
    query: DefaultQuery<C, D, E, R>;
}

export const DefaultQueryProvider = <
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
>({
    query,
    children,
}: PropsWithChildren<DefaultQueryProviderOptions<C, D, E, R>>) => {
    return createElement(DefaultQueryContext.Provider, { value: query }, children);
};
