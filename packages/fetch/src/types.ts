import { StringifiableRecord } from 'query-string';
import { CustomData } from './CustomData';
import { Resource } from '@galaxis/core';

export type PathConstraint = Record<string, string | number>;
export type QueryConstraint = StringifiableRecord;
export type HeadersConstraint = HeadersInit;
export type BodyConstraint = CustomData<unknown> | BodyInit | null;

export interface FetchVariablesConstraint {
    pathParams?: PathConstraint;
    queryParams?: QueryConstraint;
    headers?: HeadersConstraint;
    body?: BodyConstraint;
}

export type FetchVariables<T extends FetchVariablesConstraint = FetchVariablesConstraint> = T &
    Omit<RequestInit, 'body' | 'headers'>;

export type FetchResource<T extends FetchVariablesConstraint = FetchVariablesConstraint> = Resource & FetchVariables<T>;
