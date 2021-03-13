import { createElement, FC } from 'react';
import { Client, ClientProvider } from '@fetcher/react-core';
import { DefaultRequest, DefaultRequestProvider } from './DefaultRequestProvider';
import { DefaultQuery, DefaultQueryProvider, initialDefaultQuery } from './DefaultQueryProvider';
import { DefaultMutation, DefaultMutationProvider, initialDefaultMutation } from './DefaultMutationProvider';

export const Provider: FC<{
    client: Client<any>;
    request: DefaultRequest;
    query?: DefaultQuery;
    mutation?: DefaultMutation;
}> = ({ client, request, query = initialDefaultQuery, mutation = initialDefaultMutation, children }) => {
    return createElement(
        ClientProvider,
        { client },
        createElement(
            DefaultRequestProvider,
            { request },
            createElement(
                DefaultQueryProvider,
                { query },
                createElement(DefaultMutationProvider, { mutation }, children),
            ),
        ),
    );
};
