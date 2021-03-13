import { RequestParams } from './types';
import { getUrl } from './getUrl';
import { CommonRequestOptions } from '@fetcher/core';
import { getHashBase64 } from '@fetcher/utils';

export function getRequestId({ requestParams }: CommonRequestOptions<RequestParams>) {
    const { root, ...restRequestParams } = requestParams;
    return `${getUrl(restRequestParams)}:${getHashBase64(restRequestParams)}`;
}
