import { NonUndefined, Query } from '@fetcher/core';

export function getParametrizedQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R, P>(
    factory: (params: P) => Partial<Query<C, D, E, R>>,
): (query: Omit<Partial<Query<C, D, E, R>>, 'requestParams'> & { requestParams: P }) => Partial<Query<C, D, E, R>> {
    return ({ requestParams, ...query }) => ({
        ...factory(requestParams),
        ...query,
    });
}
