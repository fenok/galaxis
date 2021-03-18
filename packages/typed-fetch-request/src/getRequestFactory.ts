import { RequestParams } from './types';
import { getUrl } from './getUrl';
import { processResponseJson } from './processResponse';
import { RequestOptions } from '@fetcher/core';
import { getRequestInit } from './getRequestInit';
import { NonUndefined } from '@fetcher/core';

export interface GetRequestFactoryOptions<D extends NonUndefined> {
    fetch?: typeof fetch;
    processResponse?(response: Response): D;
}

export function getRequestFactory<D extends NonUndefined>({
    fetch: fetchFn,
    processResponse,
}: GetRequestFactoryOptions<D>) {
    return ({ requestParams }: RequestOptions<RequestParams>) => {
        return (abortSignal?: AbortSignal) => {
            return (fetchFn || fetch)(getUrl(requestParams), {
                ...getRequestInit(requestParams),
                signal: abortSignal,
            }).then(processResponse || processResponseJson);
        };
    };
}
