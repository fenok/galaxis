import { createContext, createElement, PropsWithChildren } from 'react';

export type HashRequest = (request: unknown) => string | number;

export const HashRequestContext = createContext<HashRequest>(() => {
    throw new Error('No request hash getter provided');
});

export interface HashRequestProviderOptions {
    hashRequest: HashRequest;
}

export const HashRequestProvider = ({ hashRequest, children }: PropsWithChildren<HashRequestProviderOptions>) => {
    return createElement(HashRequestContext.Provider, { value: hashRequest }, children);
};
