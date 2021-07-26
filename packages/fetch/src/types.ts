import { StringifiableRecord } from 'query-string';
import { CustomData } from './CustomData';
import { Resource } from '@galaxis/core';

export type PathConstraint = Record<string, string | number>;
export type QueryConstraint = StringifiableRecord;
export type HeadersConstraint = HeadersInit;
export type BodyConstraint = CustomData<unknown> | BodyInit | null;

export interface FetchResourceConstraint {
    pathParams?: PathConstraint;
    queryParams?: QueryConstraint;
    headers?: HeadersConstraint;
    body?: BodyConstraint;
}

export type DynamicFetchResource<T extends FetchResourceConstraint = FetchResourceConstraint> = T &
    Omit<RequestInit, 'body' | 'headers'>;

export type FetchResource<T extends FetchResourceConstraint = FetchResourceConstraint> = Resource &
    DynamicFetchResource<T>;
