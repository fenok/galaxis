import { FetchRequestParams } from './types';
import { getUrl } from './getUrl';
import { CommonRequestOptions } from '@fetcher/core';
import { getHashBase64 } from '@fetcher/utils';

export function getRequestId({ requestParams }: CommonRequestOptions<FetchRequestParams>) {
    const { root, ...restRequestParams } = requestParams;
    return `${getUrl(restRequestParams)}:${getHashBase64(restRequestParams)}`;
}
