import { FetchResource } from './types';
import { getUrl } from './getUrl';
import { getRequestInit } from './getRequestInit';
import { NonUndefined } from '@galaxis/core';

export interface GetRequestFactoryOptions<D extends NonUndefined> {
    root?: string;
    fetch?: typeof fetch;
    processResponse(response: Response): Promise<D>;
}

export function request<D extends NonUndefined>({
    root,
    fetch: fetchFn,
    processResponse,
}: GetRequestFactoryOptions<D>) {
    return (resource: FetchResource, abortSignal?: AbortSignal) => {
        return (fetchFn || fetch)(getUrl({ root, resource }), {
            ...getRequestInit(resource),
            signal: abortSignal,
        }).then(processResponse);
    };
}
