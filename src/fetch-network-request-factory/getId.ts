import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';

export function getId(requestInit: FetchRequestInit) {
    return getUrl(requestInit);
}
