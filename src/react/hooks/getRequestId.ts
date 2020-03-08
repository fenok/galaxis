import { Client } from '../../core/client';
import { PartialRequestData } from '../../core/request';
import { SDC, RC, PPC, QPC, BC } from '../../core/request/types';

export function getRequestId<C extends SDC, R extends RC, P extends PPC, Q extends QPC, B extends BC>(
    request: PartialRequestData<C, R, P, Q, B>,
    client: Client,
    getPartialRequestId?: (request: PartialRequestData<C, R, P, Q, B>) => string | number,
) {
    let requestId: string | number;
    if (getPartialRequestId) {
        requestId = getPartialRequestId(request);
    } else {
        const completeRequest = client.getCompleteRequestData(request);
        requestId = completeRequest.getId(completeRequest);
    }

    return requestId;
}
