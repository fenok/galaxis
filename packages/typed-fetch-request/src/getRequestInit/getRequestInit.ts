import { FetchRequestInit } from '../types';
import { CustomData } from '../CustomData';

export function getRequestInit(requestInit: FetchRequestInit): RequestInit {
    if (requestInit.body instanceof CustomData) {
        const body = requestInit.body.serialize();
        const headers = addContentTypeHeader(requestInit.headers, requestInit.body.contentType);

        return { ...requestInit, body, headers };
    }

    return requestInit as RequestInit;
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
