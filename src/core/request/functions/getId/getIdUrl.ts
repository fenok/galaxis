import { RequestData } from '../../types';

export function getIdUrl(request: RequestData) {
    return request.getUrl(request);
}
