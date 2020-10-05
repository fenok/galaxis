import { CC, RC, EC, YarfRequest } from '../../core/request';
import { getIdBase64 } from './getIdBase64';

export function getRequestId<C extends CC, R extends RC, E extends EC, I>(
    request: YarfRequest<C, R, E, I>,
    getPartialRequestId?: (request: YarfRequest<C, R, E, I>) => string | number,
) {
    let requestId: string | number;
    if (getPartialRequestId) {
        requestId = getPartialRequestId(request);
    } else {
        requestId = getIdBase64(request);
    }

    return requestId;
}
