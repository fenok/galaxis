import { BaseRequest, NonUndefined } from '@fetcher/react-core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultRequest<
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
> = BaseRequest<C, D, E, I>;

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
    I = any
> {
    request: DefaultRequest<C, D, E, I>;
}

export const DefaultRequestProvider = <
    C extends NonUndefined = any,
    D extends NonUndefined = any,
    E extends Error = any,
    I = any
>({
    request,
    children,
}: PropsWithChildren<DefaultRequestProviderOptions<C, D, E, I>>) => {
    return createElement(DefaultRequestContext.Provider, { value: request }, children);
};
