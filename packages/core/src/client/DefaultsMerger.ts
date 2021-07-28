import { BaseRequest, Mutation, NonUndefined, Query, Resource } from '../types';

export interface DefaultsMergerOptions<
    TCacheData extends NonUndefined = NonUndefined,
    TBaseData extends NonUndefined = NonUndefined,
    TBaseError extends Error = Error,
    TBaseResource extends Resource = Resource
> {
    defaultRequest?: Partial<BaseRequest<TCacheData, TBaseData, TBaseError, TBaseResource>>;
    defaultQuery?: Partial<Query<TCacheData, TBaseData, TBaseError, TBaseResource>>;
    defaultMutation?: Partial<Mutation<TCacheData, TBaseData, TBaseError, TBaseResource>>;
}

export class DefaultsMerger<
    TCacheData extends NonUndefined = NonUndefined,
    TBaseData extends NonUndefined = NonUndefined,
    TBaseError extends Error = Error,
    TBaseResource extends Resource = Resource
> {
    private defaultRequest?: Partial<BaseRequest<TCacheData, TBaseData, TBaseError, TBaseResource>>;
    private defaultQuery?: Partial<Query<TCacheData, TBaseData, TBaseError, TBaseResource>>;
    private defaultMutation?: Partial<Mutation<TCacheData, TBaseData, TBaseError, TBaseResource>>;

    constructor({
        defaultRequest,
        defaultQuery,
        defaultMutation,
    }: DefaultsMergerOptions<TCacheData, TBaseData, TBaseError, TBaseResource>) {
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
