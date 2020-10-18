import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { processResponse } from './processResponse';

export function getRequestFactory(fetchFn?: typeof fetch) {
    return (requestInit: FetchRequestInit) => {
        return (abortSignal?: AbortSignal) => {
            return (fetchFn ?? fetch)(getUrl(requestInit), { ...requestInit, signal: abortSignal }).then(
                processResponse,
            );
        };
    };
}
