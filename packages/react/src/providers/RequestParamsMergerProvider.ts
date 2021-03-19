import { createContext, createElement, PropsWithChildren } from 'react';

export type RequestParamsMerger<R> = (a: R, b?: R, c?: R) => R;

export const RequestParamsMergerContext = createContext<RequestParamsMerger<any>>(() => {
    throw new Error('No query merger provided');
});

export interface RequestParamsMergerProviderOptions<R> {
    requestParamsMerger: RequestParamsMerger<R>;
}

export const RequestParamsMergerProvider = <R>({
    requestParamsMerger,
    children,
}: PropsWithChildren<RequestParamsMergerProviderOptions<R>>) => {
    return createElement(RequestParamsMergerContext.Provider, { value: requestParamsMerger }, children);
};
