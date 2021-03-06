import { compile } from 'path-to-regexp';
import { stringifyQuery } from './stringifyQuery';
import { FetchRequestInit } from '../types';

export function getUrl({ root, path, pathParams, queryParams }: FetchRequestInit) {
    return `${root || ''}${compile(path)(pathParams)}${stringifyQuery(queryParams)}`;
}
