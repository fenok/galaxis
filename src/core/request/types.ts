export type FetchPolicy = 'cache-only' | 'cache-first' | 'cache-and-network' |  'no-cache';

export type SDC = object;
export type RC = any;
export type PPC = {[key: string]: string | undefined};
export type QPC = {[key: string]: string | undefined | null};
export type BC = BodyInit | null;

export interface GeneralRequestData<C extends SDC = any, R extends RC = any, P extends PPC = any, Q extends QPC = any, B extends BC = any> extends RequestInit {
    root: string;
    fetchPolicy: FetchPolicy;
    pathParams?: P,
    queryParams?: Q,
    body?: B,
    getId(requestInit: RequestData<C, R, P, Q, B>): string;
    getUrl(requestInit: RequestData<C, R, P, Q, B>): string;
    processResponse(response: Response): Promise<R>;
    merge(generalData: GeneralRequestData<C, R, P, Q, B>, partialData: PartialRequestData<C, R, P, Q, B>): RequestData<C, R, P, Q, B>;
    toCache?(sharedData: C, responseData: R, requestInit: RequestData<C, R, P, Q, B>): C;
    fromCache?(cache: C, requestInit: RequestData<C, R, P, Q, B>): R;
}

export type ConcreteRequestData<P extends PPC = any, Q extends QPC = any, B extends BC = any> = {
    path: string;
} & (P extends {[key: string]: string | undefined} ? {pathParams: P} : {})
 & (Q extends {[key: string]: string | undefined | null} ? {queryParams: Q} : {})
& (B extends BodyInit | null ? {body: B} : {})

export type RequestData<C extends SDC = any, R extends RC = any, P extends PPC = any, Q extends QPC = any, B extends BC = any> = GeneralRequestData<C, R, P, Q, B> & ConcreteRequestData<P, Q, B>

export type PartialRequestData<C extends SDC = any, R extends RC = any, P extends PPC = any, Q extends QPC = any, B extends BC = any> = Partial<GeneralRequestData<C, R, P, Q, B>> & ConcreteRequestData<P, Q, B>
