import { CC, RC, EC, YarfRequest } from '../../core/request';
import { getHashBase64 } from './getHashBase64';

export function getRequestHash<C extends CC, R extends RC, E extends EC, I>(
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
