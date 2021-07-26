export function getParametrizedRequest<REQUEST, P>(
    factory: (params: P) => REQUEST,
    merge: <R1, R2>(r1: R1, r2: R2) => R1 & R2,
): (request: Omit<REQUEST, 'resource'> & { resource: P }) => REQUEST {
    return ({ resource, ...request }) => merge(factory(resource), request);
}
