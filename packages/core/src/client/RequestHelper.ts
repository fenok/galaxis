import { Signals, delayedPromise } from '../promise';
import { logger } from '../logger';
import { NonUndefined, BaseRequest } from '../types';

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
            ).then((dataOrError) => {
                if (dataOrError instanceof Error) {
                    logger.warn(
                        'Network request promise was fulfilled with an error. You should reject the promise instead. Error: ',
                        dataOrError,
                    );
                    throw dataOrError;
                } else {
                    return dataOrError;
                }
            });
    }
}
