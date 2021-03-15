import { RequestParams } from './types';
import { getUrl } from './getUrl';
import { processResponseJson } from './processResponse';
import { RequestOptions } from '@fetcher/core';
import { getRequestInit } from './getRequestInit';

export interface GetRequestFactoryOptions {
    fetch?: typeof fetch;
    processResponse?(response: Response): any;
}

export function getRequestFactory({ fetch: fetchFn, processResponse }: GetRequestFactoryOptions) {
    return ({ requestParams }: RequestOptions<RequestParams>) => {
        return (abortSignal?: AbortSignal) => {
            return (fetchFn || fetch)(getUrl(requestParams), {
                ...getRequestInit(requestParams),
                signal: abortSignal,
            }).then(processResponse || processResponseJson);
        };
    };
}