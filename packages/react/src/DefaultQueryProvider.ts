import { DefaultRequest } from './DefaultRequestProvider';
import { NonUndefined, Query } from '@fetcher/react-core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultQuery<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
> = Partial<DefaultRequest<C, D, E, I>> & Omit<Query<C, D, E, I>, keyof DefaultRequest<C, D, E, I>>;

export const initialDefaultQuery: DefaultQuery = {
    fetchPolicy: 'no-cache',
};

export const DefaultQueryContext = createContext<DefaultQuery>(initialDefaultQuery);

export interface DefaultQueryProviderOptions<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
> {
    query: DefaultQuery<C, D, E, I>;
}

export const DefaultQueryProvider = <
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
>({
    query,
    children,
}: PropsWithChildren<DefaultQueryProviderOptions<C, D, E, I>>) => {
    return createElement(DefaultQueryContext.Provider, { value: query }, children);
};
