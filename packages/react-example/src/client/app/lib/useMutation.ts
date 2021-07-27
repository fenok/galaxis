import { Mutation, NonUndefined, Resource, useMutation as useMutationLib } from '@galaxis/react';

export type ExtractTypesMutation<T extends Mutation<NonUndefined, NonUndefined, Error, Resource>> = T extends Mutation<
    infer TCache,
    infer TData,
    infer TError,
    infer TResource
>
    ? [TCache, TData, TError, TResource]
    : never;

export function useMutation<TMutation extends Mutation<NonUndefined, NonUndefined, Error, Resource>>(
    mutation?: TMutation,
) {
    return useMutationLib<
        ExtractTypesMutation<TMutation>[0],
        ExtractTypesMutation<TMutation>[1],
        ExtractTypesMutation<TMutation>[2],
        ExtractTypesMutation<TMutation>[3]
    >(mutation);
}
