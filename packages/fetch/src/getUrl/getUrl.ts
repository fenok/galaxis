import { compile } from 'path-to-regexp';
import { stringifyQuery } from './stringifyQuery';
import { FetchResource } from '../types';

export interface GetUrlOptions {
    resource: FetchResource;
    root?: string;
}

export function getUrl({ root, resource: { name, pathParams, queryParams } }: GetUrlOptions) {
    return `${root || ''}${compile(name)(pathParams)}${stringifyQuery(queryParams)}`;
}
