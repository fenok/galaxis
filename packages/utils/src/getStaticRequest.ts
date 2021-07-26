export function getStaticRequest<REQUEST>(request: REQUEST): (requestPart?: Partial<REQUEST>) => REQUEST {
    return (requestPart) => ({ ...request, ...requestPart });
}
