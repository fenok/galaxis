import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { CommonRequestOptions } from '../core/types';

export function getId({ requestInit }: CommonRequestOptions<FetchRequestInit>) {
    return getUrl(requestInit);
}
