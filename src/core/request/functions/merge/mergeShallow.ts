import { GeneralRequestData, PartialRequestData, RequestData } from '../../types';

export function mergeShallow(generalPart: GeneralRequestData, requestData: PartialRequestData): RequestData {
    return {...generalPart, ...requestData};
}
