export function getStaticRequest<REQUEST>(
    request: REQUEST,
    merge: <R1, R2>(r1: R1, r2: R2) => R1 & R2,
): (requestPart?: Partial<REQUEST>) => REQUEST {
    return (requestPart) => merge(request, requestPart);
}
