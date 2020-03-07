import { compile } from 'path-to-regexp';
import { RequestData } from '../../types';
import { stringifyQuery } from './stringifyQuery';

export function getUrlDefault({root, path, pathParams, queryParams}: RequestData) {
    return `${root}${compile(path)(pathParams)}${stringifyQuery(queryParams)}`
}
