import { DefaultRequest } from './DefaultRequestProvider';
import { NonUndefined, BaseMutation } from '@fetcher/react-core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultMutation<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
> = Partial<DefaultRequest<C, D, E, I>> & Omit<BaseMutation<C, D, E, I>, keyof DefaultRequest<C, D, E, I>>;

export const initialDefaultMutation: DefaultMutation = {};

export const DefaultMutationContext = createContext<DefaultMutation>(initialDefaultMutation);

export interface DefaultMutationProviderOptions<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
> {
    mutation: DefaultMutation<C, D, E, I>;
}

export const DefaultMutationProvider = <
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
>({
    mutation,
    children,
}: PropsWithChildren<DefaultMutationProviderOptions<C, D, E, I>>) => {
    return createElement(DefaultMutationContext.Provider, { value: mutation }, children);
};
