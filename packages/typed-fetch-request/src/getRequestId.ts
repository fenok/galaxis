import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { CommonRequestOptions } from '@fetcher/core';
import { getHashBase64 } from '@fetcher/utils';

export function getRequestId({ requestInit }: CommonRequestOptions<FetchRequestInit>) {
    const { root, ...restRequestInit } = requestInit;
    return `${getUrl(restRequestInit)}:${getHashBase64(restRequestInit)}`;
}
