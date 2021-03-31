import { delayedPromise, Signals } from '../promise';
import { BaseRequest, NonUndefined } from '../types';

export class RequestHelper {
    public static getPromiseFactory<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
        request: BaseRequest<C, D, E, R>,
        signals: Signals = {},
    ): (abortDelaySignal?: AbortSignal) => Promise<D> {
        return (abortDelaySignal?: AbortSignal) =>
            delayedPromise(
                request.getRequestFactory
                    ? request.getRequestFactory(request)
                    : () => Promise.reject(new Error('No request factory provided')),
                {
                    ...signals,
                    abortDelaySignal,
                },
            );
    }
}
