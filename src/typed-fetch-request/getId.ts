import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { CommonRequestOptions } from '../core';

export function getId({ requestInit }: CommonRequestOptions<FetchRequestInit>) {
    return getUrl(requestInit);
}
