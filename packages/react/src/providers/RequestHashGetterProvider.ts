import { createContext, createElement, PropsWithChildren } from 'react';

export type RequestHashGetter = (request: unknown) => string | number;

export const RequestHashGetterContext = createContext<RequestHashGetter>(() => {
    throw new Error('No request hash getter provided');
});

export interface RequestHashGetterProviderOptions {
    requestHashGetter: RequestHashGetter;
}

export const RequestHashGetterProvider = ({
    requestHashGetter,
    children,
}: PropsWithChildren<RequestHashGetterProviderOptions>) => {
    return createElement(RequestHashGetterContext.Provider, { value: requestHashGetter }, children);
};
