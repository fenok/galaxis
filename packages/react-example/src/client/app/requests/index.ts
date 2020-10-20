import { BaseRequest, getHashBase64, Query } from '@fetcher/react';
import { CacheData, User, ErrorResponse } from '../client/getClient';
import { getRequestFactory, FetchRequestInit, ResponseError } from '@fetcher/typed-fetch-request';
import nodeFetch from 'node-fetch';

export const baseRequest: Omit<BaseRequest<CacheData, any, Error, FetchRequestInit>, 'requestInit'> = {
    getRequestFactory: getRequestFactory(
        typeof window === 'undefined' ? ((nodeFetch as unknown) as typeof fetch) : undefined,
    ),
    getRequestId({ requestInit }) {
        return getHashBase64(requestInit);
    },
};

export const userQuery: Query<CacheData, User[], ResponseError<ErrorResponse>, FetchRequestInit> = {
    ...baseRequest,
    fetchPolicy: 'cache-and-network',
    preventExcessRequestOnHydrate: false,
    requestInit: {
        root: 'https://jsonplaceholder.typicode.com',
        path: '/users',
    },
    toCache({ cacheData, data }) {
        return {
            ...cacheData,
            users: data,
        };
    },
    fromCache({ cacheData }) {
        return cacheData.users;
    },
};
