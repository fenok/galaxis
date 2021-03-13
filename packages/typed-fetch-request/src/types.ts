import { StringifiableRecord } from 'query-string';
import { CustomData } from './CustomData';

export type PathConstraint = Record<string, string | number>;
export type QueryConstraint = StringifiableRecord;
export type HeadersConstraint = HeadersInit;
export type BodyConstraint = CustomData<any> | BodyInit | null;

export type RequestParamsConstraint = {
    pathParams?: PathConstraint | undefined;
    queryParams?: QueryConstraint | undefined;
    headers?: HeadersConstraint | undefined;
    body?: BodyConstraint | undefined;
};

export type DynamicRequestParams<C extends RequestParamsConstraint = RequestParamsConstraint> = C &
    Omit<RequestInit, 'body' | 'headers'>;

export type StaticRequestParams = {
    root?: string;
    path: string;
};

export type RequestParams<C extends RequestParamsConstraint = RequestParamsConstraint> = DynamicRequestParams<C> &
    StaticRequestParams;
