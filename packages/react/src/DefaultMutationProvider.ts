import { DefaultRequest } from './DefaultRequestProvider';
import { NonUndefined, BaseMutation } from '@fetcher/react-core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultMutation<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
> = Partial<DefaultRequest<C, D, E, R>> & Omit<BaseMutation<C, D, E, R>, keyof DefaultRequest<C, D, E, R>>;

export const initialDefaultMutation: DefaultMutation = {};

export const DefaultMutationContext = createContext<DefaultMutation>(initialDefaultMutation);

export interface DefaultMutationProviderOptions<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
> {
    mutation: DefaultMutation<C, D, E, R>;
}

export const DefaultMutationProvider = <
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
>({
    mutation,
    children,
}: PropsWithChildren<DefaultMutationProviderOptions<C, D, E, R>>) => {
    return createElement(DefaultMutationContext.Provider, { value: mutation }, children);
};
