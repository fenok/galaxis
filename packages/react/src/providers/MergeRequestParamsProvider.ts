import { createContext, createElement, PropsWithChildren } from 'react';

export type MergeRequestParams<R> = (a: R, b?: R, c?: R) => R;

export const MergeRequestParamsContext = createContext<MergeRequestParams<any>>(() => {
    throw new Error('No query merger provided');
});

export interface MergeRequestParamsProviderOptions<R> {
    mergeRequestParams: MergeRequestParams<R>;
}

export const MergeRequestParamsProvider = <R>({
    mergeRequestParams,
    children,
}: PropsWithChildren<MergeRequestParamsProviderOptions<R>>) => {
    return createElement(MergeRequestParamsContext.Provider, { value: mergeRequestParams }, children);
};
