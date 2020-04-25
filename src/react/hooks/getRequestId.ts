import { Client } from '../../core/client';
import { PartialRequestData } from '../../core/request';
import { SDC, RC, PPC, QPC, BC, EC, HC } from '../../core/request/types';

export function getRequestId<
    C extends SDC,
    R extends RC,
    E extends EC,
    P extends PPC,
    Q extends QPC,
    B extends BC,
    H extends HC
>(
    request: PartialRequestData<C, R, E, P, Q, B, H>,
    client: Client,
    getPartialRequestId?: (request: PartialRequestData<C, R, E, P, Q, B, H>) => string | number,
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
