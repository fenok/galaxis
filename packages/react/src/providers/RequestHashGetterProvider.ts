import { createContext, createElement, PropsWithChildren } from 'react';

export type RequestHashGetter<T> = (request: T) => string | number;

export const RequestHashGetterContext = createContext<RequestHashGetter<any>>(() => {
    throw new Error('No request hash getter provided');
});

export interface RequestHashGetterProviderOptions<T> {
    requestHashGetter: RequestHashGetter<T>;
}

export const RequestHashGetterProvider = <T>({
    requestHashGetter,
    children,
}: PropsWithChildren<RequestHashGetterProviderOptions<T>>) => {
    return createElement(RequestHashGetterContext.Provider, { value: requestHashGetter }, children);
};
