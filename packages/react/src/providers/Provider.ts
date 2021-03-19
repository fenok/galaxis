import { ComponentType, createElement, PropsWithChildren } from 'react';
import { DefaultRequestProvider, DefaultRequestProviderOptions } from './DefaultRequestProvider';
import { DefaultQueryProvider, DefaultQueryProviderOptions, initialDefaultQuery } from './DefaultQueryProvider';
import {
    DefaultMutationProvider,
    DefaultMutationProviderOptions,
    initialDefaultMutation,
} from './DefaultMutationProvider';
import { ClientProvider, ClientProviderProps } from './ClientProvider';
import { RequestHashGetterProvider, RequestHashGetterProviderOptions } from './RequestHashGetterProvider';
import { RequestParamsMergerProvider, RequestParamsMergerProviderOptions } from './RequestParamsMergerProvider';
import { NonUndefined, Cache } from '@fetcher/core';

export type ProviderOptions<
    C extends NonUndefined,
    CACHE extends Cache<C>,
    D extends NonUndefined,
    E extends Error,
    R
> = ClientProviderProps<C, CACHE> &
    DefaultRequestProviderOptions<C, D, E, R> &
    Partial<DefaultQueryProviderOptions<C, D, E, R>> &
    Partial<DefaultMutationProviderOptions<C, D, E, R>> &
    RequestHashGetterProviderOptions &
    RequestParamsMergerProviderOptions<R>;

export const Provider = <C extends NonUndefined, CACHE extends Cache<C>, D extends NonUndefined, E extends Error, R>({
    client,
    request,
    query = initialDefaultQuery,
    mutation = initialDefaultMutation,
    requestHashGetter,
    requestParamsMerger,
    children,
}: PropsWithChildren<ProviderOptions<C, CACHE, D, E, R>>) => {
    return createElement(
        ClientProvider,
        { client },
        createElement(
            DefaultRequestProvider,
            { request },
            createElement(
                DefaultQueryProvider,
                { query },
                createElement(
                    DefaultMutationProvider,
                    { mutation },
                    createElement(
                        RequestHashGetterProvider,
                        { requestHashGetter },
                        createElement(
                            RequestParamsMergerProvider as ComponentType<RequestParamsMergerProviderOptions<R>>,
                            { requestParamsMerger },
                            children,
                        ),
                    ),
                ),
            ),
        ),
    );
};
