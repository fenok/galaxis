import { Request, Mutation, NonUndefined, Query, Resource } from '../types';

export interface DefaultsMergerOptions<
    TCacheData extends NonUndefined = NonUndefined,
    TBaseData extends NonUndefined = NonUndefined,
    TBaseError extends Error = Error,
> {
    defaultRequest?: Partial<Request<TCacheData, TBaseData, TBaseError, Resource>>;
    defaultQuery?: Partial<Query<TCacheData, TBaseData, TBaseError, Resource>>;
    defaultMutation?: Partial<Mutation<TCacheData, TBaseData, TBaseError, Resource>>;
}

export class DefaultsMerger<
    TCacheData extends NonUndefined = NonUndefined,
    TBaseData extends NonUndefined = NonUndefined,
    TBaseError extends Error = Error,
> {
    private defaultRequest?: Partial<Request<TCacheData, TBaseData, TBaseError, Resource>>;
    private defaultQuery?: Partial<Query<TCacheData, TBaseData, TBaseError, Resource>>;
    private defaultMutation?: Partial<Mutation<TCacheData, TBaseData, TBaseError, Resource>>;

    constructor({
        defaultRequest,
        defaultQuery,
        defaultMutation,
    }: DefaultsMergerOptions<TCacheData, TBaseData, TBaseError>) {
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
