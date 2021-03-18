import { BaseRequest, NonUndefined } from '@fetcher/core';
import { createContext, createElement, PropsWithChildren } from 'react';

export type DefaultRequest<
    C extends NonUndefined = NonUndefined,
    D extends NonUndefined = NonUndefined,
    E extends Error = Error,
    R = unknown
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
    C extends NonUndefined = NonUndefined,
    D extends NonUndefined = NonUndefined,
    E extends Error = Error,
    R = unknown
> {
    request: DefaultRequest<C, D, E, R>;
}

export const DefaultRequestProvider = <C extends NonUndefined, D extends NonUndefined, E extends Error, R>({
    request,
    children,
}: PropsWithChildren<DefaultRequestProviderOptions<C, D, E, R>>) => {
    return createElement(DefaultRequestContext.Provider, { value: request }, children);
};
