import { FetchResource } from './types';
import { getUrl } from './getUrl';
import { getRequestInit } from './getRequestInit';
import { NonUndefined } from '@galaxis/core';

export interface GetRequestFactoryOptions<TData extends NonUndefined> {
    root?: string;
    fetch?: typeof fetch;
    processResponse(response: Response): Promise<TData>;
}

export function request<TData extends NonUndefined>({
    root,
    fetch: fetchFn,
    processResponse,
}: GetRequestFactoryOptions<TData>) {
    return (resource: FetchResource, abortSignal?: AbortSignal) => {
        return (fetchFn || fetch)(getUrl({ root, resource }), {
            ...getRequestInit(resource),
            signal: abortSignal,
        }).then(processResponse);
    };
}
