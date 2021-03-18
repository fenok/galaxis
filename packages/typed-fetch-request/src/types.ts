import { StringifiableRecord } from 'query-string';
import { CustomData } from './CustomData';

export type PathConstraint = Record<string, string | number>;
export type QueryConstraint = StringifiableRecord;
export type HeadersConstraint = HeadersInit;
export type BodyConstraint = CustomData<unknown> | BodyInit | null;

export type RequestParamsConstraint = {
    pathParams?: PathConstraint;
    queryParams?: QueryConstraint;
    headers?: HeadersConstraint;
    body?: BodyConstraint;
};

export type DynamicRequestParams<T extends RequestParamsConstraint = RequestParamsConstraint> = T &
    Omit<RequestInit, 'body' | 'headers'>;

export type StaticRequestParams = {
    root?: string;
    path: string;
};

export type RequestParams<T extends RequestParamsConstraint = RequestParamsConstraint> = DynamicRequestParams<T> &
    StaticRequestParams;
