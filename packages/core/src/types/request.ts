import { NonUndefined } from './helpers';

export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' | 'no-cache';

export interface Resource {
    name: string;
}

export interface FromCacheOptions<TCacheData extends NonUndefined, TResource extends Resource> {
    cacheData: TCacheData;
    resource: TResource;
    requestId: string;
}

export interface ToCacheOptions<TCacheData extends NonUndefined, TData extends NonUndefined, TResource extends Resource>
    extends FromCacheOptions<TCacheData, TResource> {
    data: TData;
}

export interface Request<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource
> {
    resource: TResource;
    abortSignal?: AbortSignal;
    request?(resource: TResource, abortSignal?: AbortSignal): Promise<TData>;
    toCache?(opts: ToCacheOptions<TCacheData, TData, TResource>): TCacheData;
    __errorType?: TError;
}

export interface Query<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource
> extends Request<TCacheData, TData, TError, TResource> {
    fetchPolicy?: FetchPolicy;
    disableSsr?: boolean;
    optimizeOnHydrate?: boolean;
    forceRequestOnMerge?: boolean;
    softAbortSignal?: AbortSignal;
    fromCache?(opts: FromCacheOptions<TCacheData, TResource>): TData | undefined;
}

export interface Mutation<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource
> extends Request<TCacheData, TData, TError, TResource> {
    fetchPolicy?: Extract<FetchPolicy, 'cache-and-network' | 'no-cache'>;
    optimisticData?: TData;
}
