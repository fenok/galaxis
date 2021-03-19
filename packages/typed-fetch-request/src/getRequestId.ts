import { RequestParams } from './types';
import { getUrl } from './getUrl';
import { RequestOptions } from '@fetcher/core';

export interface GetRequestIdOptions {
    hash(value: unknown): string | number;
}

export function getRequestId({ hash }: GetRequestIdOptions) {
    return ({ requestParams }: RequestOptions<RequestParams>) => {
        const { root, ...restRequestParams } = requestParams;
        return `${getUrl(restRequestParams)}:${hash(restRequestParams)}`;
    };
}
