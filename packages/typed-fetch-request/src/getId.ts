import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { CommonRequestOptions } from '@fetcher/core';

export function getId({ requestInit }: CommonRequestOptions<FetchRequestInit>) {
    return getUrl(requestInit);
}
