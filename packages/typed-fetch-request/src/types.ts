import { StringifiableRecord } from 'query-string';
import { CustomData } from './CustomData';

type UndefinedPropertyOf<T> = {
    [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

type PartialUndefined<T> = Partial<T> & Omit<T, UndefinedPropertyOf<T>>;

export type PathConstraint = Record<string, string | number> | undefined;
export type QueryConstraint = StringifiableRecord | undefined;
export type HeadersConstraint = HeadersInit | undefined;
export type BodyConstraint = CustomData<any> | BodyInit | null | undefined;

export type FetchRequestParamsConstraint = {
    pathParams?: PathConstraint | undefined;
    queryParams?: QueryConstraint | undefined;
    headers?: HeadersConstraint | undefined;
    body?: BodyConstraint | undefined;
};

export type DynamicFetchRequestParams<
    C extends FetchRequestParamsConstraint = FetchRequestParamsConstraint
> = PartialUndefined<
    Omit<RequestInit, 'body' | 'headers'> & {
        pathParams: unknown extends C['pathParams'] ? PathConstraint : C['pathParams'];
        queryParams: unknown extends C['queryParams'] ? QueryConstraint : C['queryParams'];
        headers: unknown extends C['headers'] ? HeadersConstraint : C['headers'];
        body: unknown extends C['body'] ? BodyConstraint : C['body'];
    }
>;

export type StaticFetchRequestParams = {
    root?: string;
    path: string;
};

export type FetchRequestParams<
    C extends FetchRequestParamsConstraint = FetchRequestParamsConstraint
> = DynamicFetchRequestParams<C> & StaticFetchRequestParams;
