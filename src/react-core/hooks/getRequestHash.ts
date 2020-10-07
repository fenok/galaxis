import { ResponseData, YarfRequest } from '../../core/request';
import { getHashBase64 } from './getHashBase64';

export function getRequestHash<C, R extends ResponseData, E extends Error, I>(
    request: YarfRequest<C, R, E, I>,
    getRequestHash?: (request: YarfRequest<C, R, E, I>) => string | number,
) {
    let requestId: string | number;
    if (getRequestHash) {
        requestId = getRequestHash(request);
    } else {
        requestId = getHashBase64(request);
    }

    return requestId;
}
