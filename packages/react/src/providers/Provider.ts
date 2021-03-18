import { createElement, FC } from 'react';
import { Client, NonUndefined } from '@fetcher/core';
import { DefaultRequest, DefaultRequestProvider } from './DefaultRequestProvider';
import { DefaultQuery, DefaultQueryProvider, initialDefaultQuery } from './DefaultQueryProvider';
import { DefaultMutation, DefaultMutationProvider, initialDefaultMutation } from './DefaultMutationProvider';
import { ClientProvider } from './ClientProvider';
import { RequestHashGetter, RequestHashGetterProvider } from './RequestHashGetterProvider';
import { RequestParamsMerger, RequestParamsMergerProvider } from './RequestParamsMergerProvider';

export const Provider: FC<{
    client: Client<NonUndefined>;
    request: DefaultRequest;
    query?: DefaultQuery;
    mutation?: DefaultMutation;
    requestHashGetter: RequestHashGetter;
    requestParamsMerger: RequestParamsMerger;
}> = ({
    client,
    request,
    query = initialDefaultQuery,
    mutation = initialDefaultMutation,
    requestHashGetter,
    requestParamsMerger,
    children,
}) => {
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
                        createElement(RequestParamsMergerProvider, { requestParamsMerger }, children),
                    ),
                ),
            ),
        ),
    );
};
