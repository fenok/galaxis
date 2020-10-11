import { getHashBase64 } from './getHashBase64';
import { NonUndefined, QueryInit } from '../../core';

export function getRequestHash<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
    request: QueryInit<C, R, E, I>,
    getRequestHash?: (request: QueryInit<C, R, E, I>) => string | number,
) {
    let requestId: string | number;
    if (getRequestHash) {
        requestId = getRequestHash(request);
    } else {
        requestId = getHashBase64(request);
    }

    return requestId;
}
