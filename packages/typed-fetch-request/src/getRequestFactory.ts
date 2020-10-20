import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { processResponse } from './processResponse';
import { CommonRequestOptions } from '@fetcher/core';

export function getRequestFactory(fetchFn?: typeof fetch) {
    return ({ requestInit }: CommonRequestOptions<FetchRequestInit>) => {
        return (abortSignal?: AbortSignal) => {
            return (fetchFn ?? fetch)(getUrl(requestInit), { ...requestInit, signal: abortSignal }).then(
                processResponse,
            );
        };
    };
}
