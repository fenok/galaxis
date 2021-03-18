import { createContext, createElement, PropsWithChildren } from 'react';

export type RequestParamsMerger<R1 = unknown, R2 = unknown, R3 = unknown> = (a: R1, b?: R2, c?: R3) => R1 & R2 & R3;

export const RequestParamsMergerContext = createContext<RequestParamsMerger>(() => {
    throw new Error('No query merger provided');
});

export interface RequestParamsMergerProviderOptions<R1 = unknown, R2 = unknown, R3 = unknown> {
    requestParamsMerger: RequestParamsMerger<R1, R2, R3>;
}

export const RequestParamsMergerProvider = ({
    requestParamsMerger,
    children,
}: PropsWithChildren<RequestParamsMergerProviderOptions>) => {
    return createElement(RequestParamsMergerContext.Provider, { value: requestParamsMerger }, children);
};
