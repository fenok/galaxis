import { ComponentType, createElement, PropsWithChildren } from 'react';
import { DefaultRequestProvider, DefaultRequestProviderOptions } from './DefaultRequestProvider';
import { DefaultQueryProvider, DefaultQueryProviderOptions } from './DefaultQueryProvider';
import {
    DefaultMutationProvider,
    DefaultMutationProviderOptions,
    initialDefaultMutation,
} from './DefaultMutationProvider';
import { ClientProvider, ClientProviderProps } from './ClientProvider';
import { HashRequestProvider, HashRequestProviderOptions } from './HashRequestProvider';
import { MergeRequestParamsProvider, MergeRequestParamsProviderOptions } from './MergeRequestParamsProvider';
import { NonUndefined, Cache } from '@fetcher/core';

export type ProviderOptions<
    C extends NonUndefined,
    CACHE extends Cache<C>,
    D extends NonUndefined,
    E extends Error,
    R
> = ClientProviderProps<C, CACHE> &
    DefaultRequestProviderOptions<C, D, E, R> &
    DefaultQueryProviderOptions<C, D, E, R> &
    Partial<DefaultMutationProviderOptions<C, D, E, R>> &
    HashRequestProviderOptions &
    MergeRequestParamsProviderOptions<R>;

export const Provider = <C extends NonUndefined, CACHE extends Cache<C>, D extends NonUndefined, E extends Error, R>({
    client,
    defaultRequest,
    defaultQuery,
    defaultMutation = initialDefaultMutation,
    hashRequest,
    mergeRequestParams,
    children,
}: PropsWithChildren<ProviderOptions<C, CACHE, D, E, R>>) => {
    return createElement(
        ClientProvider,
        { client },
        createElement(
            DefaultRequestProvider,
            { defaultRequest },
            createElement(
                DefaultQueryProvider,
                { defaultQuery },
                createElement(
                    DefaultMutationProvider,
                    { defaultMutation },
                    createElement(
                        HashRequestProvider,
                        { hashRequest },
                        createElement(
                            MergeRequestParamsProvider as ComponentType<MergeRequestParamsProviderOptions<R>>,
                            { mergeRequestParams },
                            children,
                        ),
                    ),
                ),
            ),
        ),
    );
};
