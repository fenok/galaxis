import { compile } from 'path-to-regexp';
import { stringifyQuery } from './stringifyQuery';
import { FetchRequestParams } from '../types';

export function getUrl({ root, path, pathParams, queryParams }: FetchRequestParams) {
    return `${root || ''}${compile(path)(pathParams)}${stringifyQuery(queryParams)}`;
}
