import { Client } from '../../core/client';
import { PartialRequestData } from '../../core/request';

export function getRequestId(request: PartialRequestData, client: Client, getPartialRequestId?: (request: PartialRequestData) => string | number) {
    let requestId: string | number;
    if(getPartialRequestId) {
        requestId = getPartialRequestId(request);
    } else {
        const completeRequest = client.getCompleteRequestData(request);
        requestId = completeRequest.getId(completeRequest);
    }

    return requestId;
}
