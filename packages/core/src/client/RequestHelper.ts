import { delayedPromise, Signals } from '../promise';
import { BaseRequest, NonUndefined, Resource } from '../types';

export class RequestHelper {
    public static getPromiseFactory<
        C extends NonUndefined,
        D extends NonUndefined,
        E extends Error,
        R extends Resource
    >(request: BaseRequest<C, D, E, R>, signals: Signals = {}): (abortDelaySignal?: AbortSignal) => Promise<D> {
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
