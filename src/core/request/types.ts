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
export type PPC = { [key: string]: string | undefined };
// Query params constraint
export type QPC = { [key: string]: string | undefined | null };
// Body constraint
export type BC = BodyInit | null;

export interface GeneralRequestData<
    C extends SDC = any,
    R extends RC = any,
    E extends EC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any
> extends RequestInit {
    root: string;
    fetchPolicy: FetchPolicy;
    pathParams?: P;
    queryParams?: Q;
    body?: B;
    getId(requestInit: RequestData<C, R, E, P, Q, B>): string;
    getUrl(requestInit: RequestData<C, R, E, P, Q, B>): string;
    processResponse(response: Response): Promise<R>;
    merge(
        generalData: GeneralRequestData<C, R, E, P, Q, B>,
        partialData: PartialRequestData<C, R, E, P, Q, B>,
    ): RequestData<C, R, E, P, Q, B>;
    toCache?(sharedData: C, responseData: R, requestInit: RequestData<C, R, E, P, Q, B>): C;
    fromCache?(cache: C, requestInit: RequestData<C, R, E, P, Q, B>): R;
}

export type ConcreteRequestData<P extends PPC = any, Q extends QPC = any, B extends BC = any> = {
    path: string;
} & (P extends { [key: string]: string | undefined } ? { pathParams: P } : {}) &
    (Q extends { [key: string]: string | undefined | null } ? { queryParams: Q } : {}) &
    (B extends BodyInit | null ? { body: B } : {});

export type RequestData<
    C extends SDC = any,
    R extends RC = any,
    E extends EC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any
> = GeneralRequestData<C, R, E, P, Q, B> & ConcreteRequestData<P, Q, B>;

export type PartialRequestData<
    C extends SDC = any,
    R extends RC = any,
    E extends EC = any,
    P extends PPC = any,
    Q extends QPC = any,
    B extends BC = any
> = Partial<GeneralRequestData<C, R, E, P, Q, B>> & ConcreteRequestData<P, Q, B>;
