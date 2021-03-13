import { FetchRequestParams } from '../types';
import { CustomData } from '../CustomData';

export function getRequestInit(requestParams: FetchRequestParams): RequestInit {
    if (requestParams.body instanceof CustomData) {
        const body = requestParams.body.serialize();
        const headers = addContentTypeHeader(requestParams.headers, requestParams.body.contentType);

        return { ...requestParams, body, headers };
    }

    return requestParams as RequestInit;
}

function addContentTypeHeader(headers: HeadersInit = {}, value: string): HeadersInit {
    let result: HeadersInit;

    if (headers instanceof Headers) {
        result = new Headers(headers);
        result.append('Content-Type', value);
    } else if (Array.isArray(headers)) {
        result = [...headers];
        result.push(['Content-Type', value]);
    } else {
        result = { ...headers };
        result['Content-Type'] = value;
    }

    return result;
}
