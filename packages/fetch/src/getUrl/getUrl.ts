import { compile } from 'path-to-regexp';
import { stringifyQuery } from './stringifyQuery';
import { RequestParams } from '../types';

export function getUrl({ root, path, pathParams, queryParams }: RequestParams) {
    return `${root || ''}${compile(path)(pathParams)}${stringifyQuery(queryParams)}`;
}
