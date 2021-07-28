import { delayedPromise, Signals } from '../promise';
import { Request, NonUndefined, Resource } from '../types';

export class RequestHelper {
    public static getPromiseFactory<
        TCacheData extends NonUndefined,
        TData extends NonUndefined,
        TError extends Error,
        TResource extends Resource
    >(
        request: Request<TCacheData, TData, TError, TResource>,
        signals: Signals = {},
    ): (abortDelaySignal?: AbortSignal) => Promise<TData> {
        return (abortDelaySignal?: AbortSignal) =>
            delayedPromise(
                request.request
                    ? request.request.bind(null, request.resource)
                    : () => Promise.reject(new Error('No request factory provided')),
                {
                    ...signals,
                    abortDelaySignal,
                },
            );
    }
}
