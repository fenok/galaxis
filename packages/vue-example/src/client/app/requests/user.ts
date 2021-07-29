import { query } from '../lib/request';
import { immerify, memoize } from '@galaxis/utils';

export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
}

export type UserQueryVariablesConstraint = { pathParams: { id: number } };
export type UserQueryVariables = { id: number };

export const userQuery = query<User, UserQueryVariablesConstraint, UserQueryVariables>((variables) => ({
    resource: {
        name: '/users/:id',
        pathParams: { id: variables.id },
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
        ({ cacheData, resource }) => {
            const user = cacheData.users[resource.pathParams.id];
            const email = cacheData.emails[resource.pathParams.id];

            return user && email ? { ...user, ...email } : undefined;
        },
        ({ cacheData, resource }) => [
            cacheData.users[resource.pathParams.id],
            cacheData.emails[resource.pathParams.id],
        ],
    ),
}));
