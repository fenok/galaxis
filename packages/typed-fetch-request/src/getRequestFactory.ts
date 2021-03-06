import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { processResponseJson } from './processResponse';
import { CommonRequestOptions } from '@fetcher/core';
import { getRequestInit } from './getRequestInit';

export interface GetRequestFactoryOptions {
    fetch?: typeof fetch;
    processResponse?(response: Response): any;
}

export function getRequestFactory({ fetch: fetchFn, processResponse }: GetRequestFactoryOptions) {
    return ({ requestInit }: CommonRequestOptions<FetchRequestInit>) => {
        return (abortSignal?: AbortSignal) => {
            return (fetchFn || fetch)(getUrl(requestInit), {
                ...getRequestInit(requestInit),
                signal: abortSignal,
            }).then(processResponse || processResponseJson);
        };
    };
}
