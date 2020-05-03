export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' | 'no-cache';

// Response part
// Shared data constraint
export type SDC = object;
// Response data constraint
export type RC = string | number | boolean | symbol | bigint | object | null; // Anything but undefined
// Response error constraint
export type EC = Error;

// Request part
// Path params constraint
export type PPC = Record<string, string | undefined>;
// Query params constraint
export type QPC = Record<string, string[] | string | undefined | null>;
// Body constraint
export type BC = BodyInit | null;
// Headers constraint
export type HC = HeadersInit;

export interface GeneralRequestData<
    C extends SDC = any,
    R extends RC = any,
    E extends EC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any,
    H extends HC = any
> extends RequestInit {
    root: string;
    fetchPolicy: FetchPolicy;
    pathParams?: P;
    queryParams?: Q;
    body?: B;
    headers?: H;
    lazy?: boolean;
    optimisticResponse?: R;
    applyFetchPolicyToError?: boolean | ((error: E) => boolean);
    rerunLoadingQueriesAfterMutation?: boolean;
    getId(requestInit: RequestData<C, R, E, P, Q, B, H>): string;
    getUrl(requestInit: RequestData<C, R, E, P, Q, B, H>): string;
    processResponse(response: Response): Promise<R>;
    merge(
        generalData: GeneralRequestData<C, R, E, P, Q, B, H>,
        partialData: PartialRequestData<C, R, E, P, Q, B, H>,
    ): RequestData<C, R, E, P, Q, B, H>;
    toCache?(sharedData: C, responseData: R, requestInit: RequestData<C, R, E, P, Q, B, H>): C;
    fromCache?(cache: C, requestInit: RequestData<C, R, E, P, Q, B, H>): R;
    clearCacheFromOptimisticResponse?(
        sharedData: C,
        optimisticResponse: R,
        requestInit: RequestData<C, R, E, P, Q, B, H>,
    ): C;
}

export type ConcreteRequestData<P extends PPC = any, Q extends QPC = any, B extends BC = any, H extends HC = any> = {
    path: string;
} & (P extends PPC ? { pathParams: P } : {}) &
    (Q extends QPC ? { queryParams: Q } : {}) &
    (B extends BC ? { body: B } : {}) &
    (H extends HC ? { headers: H } : {});

export type RequestData<
    C extends SDC = any,
    R extends RC = any,
    E extends EC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any,
    H extends HC = any
> = GeneralRequestData<C, R, E, P, Q, B, H> & ConcreteRequestData<P, Q, B, H>;

export type PartialRequestData<
    C extends SDC = any,
    R extends RC = any,
    E extends EC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any,
    H extends HC = any
> = Partial<GeneralRequestData<C, R, E, P, Q, B, H>> & ConcreteRequestData<P, Q, B, H>;
