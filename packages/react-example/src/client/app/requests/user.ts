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
    requestInit: {
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
        ({ cacheData, requestInit }) => {
            const user = cacheData.users[requestInit.pathParams.id];
            const email = cacheData.emails[requestInit.pathParams.id];

            return user && email ? { ...user, ...email } : undefined;
        },
        ({ cacheData, requestInit }) => [
            cacheData.users[requestInit.pathParams.id],
            cacheData.emails[requestInit.pathParams.id],
        ],
    ),
}));
