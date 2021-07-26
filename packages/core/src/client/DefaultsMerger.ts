import { BaseRequest, Mutation, NonUndefined, Query, Resource } from '../types';

export interface Merge {
    <R1, R2, R3>(r1: R1, r2: R2, r3: R3): R1 & R2 & R3;
}

export interface DefaultsMergerOptions<
    C extends NonUndefined = NonUndefined,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR extends Resource = Resource
> {
    defaultRequest?: Partial<BaseRequest<C, BD, BE, BR>>;
    defaultQuery?: Partial<Query<C, BD, BE, BR>>;
    defaultMutation?: Partial<Mutation<C, BD, BE, BR>>;
}

export class DefaultsMerger<
    C extends NonUndefined = NonUndefined,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR extends Resource = Resource
> {
    private defaultRequest?: Partial<BaseRequest<C, BD, BE, BR>>;
    private defaultQuery?: Partial<Query<C, BD, BE, BR>>;
    private defaultMutation?: Partial<Mutation<C, BD, BE, BR>>;

    constructor({ defaultRequest, defaultQuery, defaultMutation }: DefaultsMergerOptions<C, BD, BE, BR>) {
        this.defaultRequest = defaultRequest;
        this.defaultQuery = defaultQuery;
        this.defaultMutation = defaultMutation;
    }

    public getMergedQuery<T>(query: T): T;
    public getMergedQuery<T>(query?: T): T | undefined;
    public getMergedQuery<T>(query?: T): T | undefined {
        return query ? { ...this.defaultRequest, ...this.defaultQuery, ...query } : undefined;
    }

    public getMergedMutation<T>(mutation: T): T;
    public getMergedMutation<T>(mutation?: T): T | undefined;
    public getMergedMutation<T>(mutation?: T): T | undefined {
        return mutation ? { ...this.defaultRequest, ...this.defaultMutation, ...mutation } : undefined;
    }
}
