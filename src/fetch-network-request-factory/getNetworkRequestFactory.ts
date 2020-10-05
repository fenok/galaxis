import { FetchRequestInit } from './types';
import { getUrl } from './getUrl';
import { processResponseRestfulJson } from './processResponse';

export function getNetworkRequestFactory(fetchFn?: typeof fetch) {
    return (requestInit: FetchRequestInit) => {
        return (abortSignal?: AbortSignal) => {
            return (fetchFn ?? fetch)(getUrl(requestInit), { ...requestInit, signal: abortSignal }).then(
                processResponseRestfulJson,
            );
        };
    };
}
