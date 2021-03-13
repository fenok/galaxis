import { getQuery } from '../lib/getQuery';
import { immerify, memoize } from '@fetcher/react';

export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
}

export type UserQueryRequestParams = { P: { id: number } };

export const userQuery = getQuery<User, UserQueryRequestParams>((params) => ({
    requestParams: {
        path: '/users/:id',
        ...params,
    },
    toCache: immerify(({ cacheData, data }) => {
        cacheData.users[data.id] = {
            id: data.id,
            name: data.name,
            username: data.username,
        };
        cacheData.emails[data.id] = {
            id: data.id,
            email: data.email,
        };
    }),
    fromCache: memoize(
        ({ cacheData, requestParams }) => {
            const user = cacheData.users[requestParams.pathParams.id];
            const email = cacheData.emails[requestParams.pathParams.id];

            return user && email ? { ...user, ...email } : undefined;
        },
        ({ cacheData, requestParams }) => [
            cacheData.users[requestParams.pathParams.id],
            cacheData.emails[requestParams.pathParams.id],
        ],
    ),
}));
