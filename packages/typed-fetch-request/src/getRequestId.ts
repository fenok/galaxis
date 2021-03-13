import { RequestParams } from './types';
import { getUrl } from './getUrl';
import { RequestOptions } from '@fetcher/core';
import { getHashBase64 } from '@fetcher/utils';

export function getRequestId({ requestParams }: RequestOptions<RequestParams>) {
    const { root, ...restRequestParams } = requestParams;
    return `${getUrl(restRequestParams)}:${getHashBase64(restRequestParams)}`;
}
