import { BaseRequest, NonUndefined } from '@fetcher/core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultRequest<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
> = BaseRequest<C, D, E, R>;

export const initialDefaultRequest: DefaultRequest = {
    requestParams: {},
    getRequestId() {
        return '';
    },
    getRequestFactory() {
        return () => Promise.reject(new Error('No request factory provided'));
    },
};

export const DefaultRequestContext = createContext<DefaultRequest>(initialDefaultRequest);

export interface DefaultRequestProviderOptions<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
> {
    request: DefaultRequest<C, D, E, R>;
}

export const DefaultRequestProvider = <
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    R = any
>({
    request,
    children,
}: PropsWithChildren<DefaultRequestProviderOptions<C, D, E, R>>) => {
    return createElement(DefaultRequestContext.Provider, { value: request }, children);
};
