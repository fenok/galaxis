export function getParametrizedRequest<REQUEST, P>(
    factory: (params: P) => REQUEST,
): (request: Omit<REQUEST, 'resource'> & { resource: P }) => REQUEST {
    return ({ resource, ...request }) => ({ ...factory(resource), ...request });
}
