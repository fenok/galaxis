import { DefaultRequest } from './DefaultRequestProvider';
import { NonUndefined, BaseMutation } from '@fetcher/core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultMutation<
    C extends NonUndefined = NonUndefined,
    D extends NonUndefined = NonUndefined,
    E extends Error = Error,
    R = unknown
> = Partial<DefaultRequest<C, D, E, R>> & Omit<BaseMutation<C, D, E, R>, keyof DefaultRequest<C, D, E, R>>;

export const initialDefaultMutation = {};

export const DefaultMutationContext = createContext<DefaultMutation>(initialDefaultMutation);

export interface DefaultMutationProviderOptions<
    C extends NonUndefined = NonUndefined,
    D extends NonUndefined = NonUndefined,
    E extends Error = Error,
    R = unknown
> {
    defaultMutation: DefaultMutation<C, D, E, R>;
}

export const DefaultMutationProvider = <C extends NonUndefined, D extends NonUndefined, E extends Error, R = unknown>({
    defaultMutation,
    children,
}: PropsWithChildren<DefaultMutationProviderOptions<C, D, E, R>>) => {
    return createElement(DefaultMutationContext.Provider, { value: defaultMutation }, children);
};
