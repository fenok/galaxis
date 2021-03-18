import { createContext, createElement, PropsWithChildren } from 'react';

export type RequestParamsMerger<R1, R2, R3> = (a: R1, b?: R2, c?: R3) => R1 & R2 & R3;

export const RequestParamsMergerContext = createContext<RequestParamsMerger<any, any, any>>(() => {
    throw new Error('No query merger provided');
});

export interface RequestParamsMergerProviderOptions<R1, R2, R3> {
    requestParamsMerger: RequestParamsMerger<R1, R2, R3>;
}

export const RequestParamsMergerProvider = <R1, R2, R3>({
    requestParamsMerger,
    children,
}: PropsWithChildren<RequestParamsMergerProviderOptions<R1, R2, R3>>) => {
    return createElement(RequestParamsMergerContext.Provider, { value: requestParamsMerger }, children);
};
